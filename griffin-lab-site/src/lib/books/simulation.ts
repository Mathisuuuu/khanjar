import "server-only";
import { getDb, type Queryable } from "@/lib/db";
import type { Book } from "./repository";

/**
 * Simulation des books comme de vrais portefeuilles : une valeur (base 100)
 * par heure, tirée au hasard et enregistrée dans `book_ticks`.
 *
 * - Chaque heure : rendement aléatoire (loi normale) autour d'une tendance qui
 *   vise le rendement sur 30 jours du book (`month_return`). La tendance est
 *   corrigée quand on s'en écarte, pour rester autour de la cible.
 * - Pas de tâche planifiée : à chaque lecture, les heures manquantes sont
 *   générées (et 30 jours d'historique la première fois). L'accueil est
 *   régénéré toutes les 5 minutes, donc les chiffres bougent bien chaque heure.
 */

const HOUR = 3600_000;
const MONTH_HOURS = 30 * 24;
const WEEK_HOURS = 7 * 24;
/** Volatilité horaire : assez pour voir des pertes sur la semaine, pas assez pour s'éloigner de la cible. */
const HOURLY_VOL = 0.0028;
/** Force du rappel vers le rendement visé. */
const REVERSION = 0.6;
/** On garde un peu plus d'un mois d'historique. */
const KEEP_HOURS = 40 * 24;

export type BookLive = {
  /** Rendement sur 30 jours glissants, en %. */
  monthReturn: number;
  /** Rendement depuis 7 jours, en %. */
  weekReturn: number;
  /** Courbe des 7 derniers jours : rendement cumulé en % depuis le début de la fenêtre (un point par heure). */
  week: number[];
  updatedAt: string;
};

const floorHour = (time: number) => Math.floor(time / HOUR) * HOUR;

/** Tirage selon une loi normale centrée réduite (Box-Muller). */
function gaussian(): number {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

async function extend(tx: Queryable, book: Book, target: number, now: number) {
  // verrou sur le book : deux requêtes simultanées ne génèrent pas deux fois les mêmes heures
  await tx.query("SELECT id FROM books WHERE id = $1 FOR UPDATE", [book.id]);
  const history = (
    await tx.query<{ at: Date; equity: number }>(
      "SELECT at, equity FROM book_ticks WHERE book_id = $1 ORDER BY at DESC LIMIT $2",
      [book.id, MONTH_HOURS + 1],
    )
  )
    .reverse()
    .map((row) => ({ at: new Date(row.at).getTime(), equity: Number(row.equity) }));

  const end = floorHour(now);
  let at = history.length ? history[history.length - 1].at : end - MONTH_HOURS * HOUR;
  if (!history.length) history.push({ at, equity: 100 });
  if (at >= end) return;

  const drift = Math.log(1 + target / 100) / MONTH_HOURS;
  const times: string[] = [];
  const values: number[] = [];
  while (at < end) {
    at += HOUR;
    const last = history[history.length - 1].equity;
    const monthAgo = history[Math.max(0, history.length - 1 - MONTH_HOURS)];
    const elapsed = Math.max(1, history.length - 1 - Math.max(0, history.length - 1 - MONTH_HOURS));
    // écart entre le rendement réalisé (ramené à 30 jours) et la cible
    const realized = (Math.log(last / monthAgo.equity) * MONTH_HOURS) / elapsed;
    // (rappel seulement avec au moins 3 jours d'historique : avant, l'estimation est trop bruitée)
    const gap = elapsed >= 72 ? Math.log(1 + target / 100) - realized : 0;
    const step = drift + (REVERSION * gap) / MONTH_HOURS * 6 + HOURLY_VOL * gaussian();
    const equity = last * Math.exp(step);
    history.push({ at, equity });
    times.push(new Date(at).toISOString());
    values.push(equity);
  }

  await tx.query(
    `INSERT INTO book_ticks (book_id, at, equity)
     SELECT $1, t.at, t.equity FROM unnest($2::timestamptz[], $3::float8[]) AS t(at, equity)
     ON CONFLICT DO NOTHING`,
    [book.id, times, values],
  );
  await tx.query("DELETE FROM book_ticks WHERE book_id = $1 AND at < $2", [
    book.id,
    new Date(end - KEEP_HOURS * HOUR).toISOString(),
  ]);
}

/** Génère les heures manquantes des books qui ont un rendement visé. */
export async function advanceBooks(books: Book[], now = Date.now()): Promise<void> {
  const simulated = books.filter((book) => book.stats);
  if (simulated.length === 0) return;
  const db = await getDb();
  const latest = await db.query<{ book_id: string; at: Date }>(
    "SELECT book_id, max(at) AS at FROM book_ticks WHERE book_id = ANY($1) GROUP BY book_id",
    [simulated.map((b) => b.id)],
  );
  const end = floorHour(now);
  for (const book of simulated) {
    const last = latest.find((row) => row.book_id === book.id);
    if (last && new Date(last.at).getTime() >= end) continue; // déjà à jour : aucune écriture
    await db.transaction((tx) => extend(tx, book, book.stats!.monthReturn, now));
  }
}

/** Avance la simulation puis renvoie les chiffres en direct de chaque book simulé. */
export async function liveStats(books: Book[]): Promise<Map<string, BookLive>> {
  const result = new Map<string, BookLive>();
  const simulated = books.filter((book) => book.stats);
  if (simulated.length === 0) return result;
  await advanceBooks(simulated);

  const db = await getDb();
  const rows = await db.query<{ book_id: string; at: Date; equity: number }>(
    `SELECT book_id, at, equity FROM book_ticks
     WHERE book_id = ANY($1) AND at >= $2 ORDER BY book_id, at`,
    [simulated.map((b) => b.id), new Date(floorHour(Date.now()) - MONTH_HOURS * HOUR).toISOString()],
  );

  for (const book of simulated) {
    const ticks = rows.filter((row) => row.book_id === book.id).map((row) => Number(row.equity));
    if (ticks.length < 2) continue;
    const now = ticks[ticks.length - 1];
    const week = ticks.slice(-(WEEK_HOURS + 1));
    const base = week[0];
    const lastAt = rows.filter((row) => row.book_id === book.id).at(-1)!.at;
    result.set(book.id, {
      monthReturn: (now / ticks[0] - 1) * 100,
      weekReturn: (now / base - 1) * 100,
      week: week.map((value) => (value / base - 1) * 100),
      updatedAt: new Date(lastAt).toISOString(),
    });
  }
  return result;
}
