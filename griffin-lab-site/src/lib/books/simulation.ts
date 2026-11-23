import "server-only";
import { getDb, type Queryable } from "@/lib/db";
import { rollAllTime, type Book } from "./repository";

/**
 * Simulation des books comme de vrais portefeuilles : une valeur (base 100)
 * par heure, tirée au hasard et enregistrée dans `book_ticks`.
 *
 * - Chaque heure : rendement aléatoire (loi normale) autour d'une tendance qui
 *   vise le rendement moyen par jour du book (`daily_return`, +0,8 %). Un rappel
 *   doux ramène le mois écoulé vers cette moyenne.
 * - La volatilité dépend du nombre de stratégies : plus un book en a, plus ses
 *   journées sont régulières (écart type d'une journée : 1,6 % pour 6 stratégies,
 *   × √(6 / n) sinon). Avec +0,8 % de moyenne, les jours de gain sont nettement
 *   plus nombreux que les jours de perte (environ 7 sur 10 pour 6 stratégies).
 * - « 1 J » : rendement de la dernière journée complète (minuit à minuit, UTC),
 *   donc un nouveau chiffre chaque jour. « All time » : rendement depuis le
 *   lancement, cumulé chaque jour avec cette journée.
 * - Pas de tâche planifiée : à chaque lecture, les heures manquantes sont
 *   générées (et 30 jours d'historique la première fois).
 */

const HOUR = 3600_000;
const DAY_HOURS = 24;
const MONTH_HOURS = 30 * DAY_HOURS;
const WEEK_HOURS = 7 * DAY_HOURS;
/** Écart type d'une journée pour un book de 6 stratégies (en fraction). */
const DAILY_VOL_6 = 0.016;
/** Force du rappel vers le rendement moyen visé. */
const REVERSION = 0.6;
/** On garde un peu plus d'un mois d'historique. */
const KEEP_HOURS = 40 * DAY_HOURS;

export type BookLive = {
  /** Rendement de la dernière journée complète (UTC), en %. */
  dayReturn: number;
  /** Rendement depuis le lancement, en %, ou `null` s'il n'est pas renseigné. */
  allTime: number | null;
  /** Rendement depuis 7 jours, en %. */
  weekReturn: number;
  /** Courbe des 7 derniers jours : rendement cumulé en % depuis le début de la fenêtre (un point par heure). */
  week: number[];
  updatedAt: string;
};

const floorHour = (time: number) => Math.floor(time / HOUR) * HOUR;
const floorDay = (time: number) => Math.floor(time / (DAY_HOURS * HOUR)) * DAY_HOURS * HOUR;

/** Volatilité horaire d'un book selon son nombre de stratégies. */
const hourlyVol = (strategies: number) => (DAILY_VOL_6 * Math.sqrt(6 / Math.max(1, strategies))) / Math.sqrt(DAY_HOURS);

/** Tirage selon une loi normale centrée réduite (Box-Muller). */
function gaussian(): number {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

async function extend(tx: Queryable, book: Book, now: number) {
  const stats = book.stats!;
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

  const drift = Math.log(1 + stats.dailyReturn / 100) / DAY_HOURS;
  const vol = hourlyVol(stats.strategies);
  const times: string[] = [];
  const values: number[] = [];
  while (at < end) {
    at += HOUR;
    const last = history[history.length - 1].equity;
    const start = Math.max(0, history.length - 1 - MONTH_HOURS);
    const elapsed = Math.max(1, history.length - 1 - start);
    // écart entre le rendement horaire moyen réalisé sur le mois et la tendance visée
    // (rappel seulement avec au moins 3 jours d'historique : avant, l'estimation est trop bruitée)
    const gap = elapsed >= 72 ? drift - Math.log(last / history[start].equity) / elapsed : 0;
    const equity = last * Math.exp(drift + REVERSION * gap * 6 + vol * gaussian());
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

/** Génère les heures manquantes des books qui ont des chiffres. */
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
    await db.transaction((tx) => extend(tx, book, now));
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
    `SELECT book_id, at, equity FROM book_ticks WHERE book_id = ANY($1) ORDER BY book_id, at`,
    [simulated.map((b) => b.id)],
  );

  const today = floorDay(Date.now());
  for (const book of simulated) {
    const ticks = rows
      .filter((row) => row.book_id === book.id)
      .map((row) => ({ at: new Date(row.at).getTime(), equity: Number(row.equity) }));
    if (ticks.length < 2) continue;
    const equityAt = (time: number) => ticks.find((tick) => tick.at === time)?.equity;
    const last = ticks[ticks.length - 1];
    const week = ticks.slice(-(WEEK_HOURS + 1)).map((tick) => tick.equity);
    const base = week[0];

    // dernière journée complète : de minuit hier à minuit aujourd'hui
    const close = equityAt(today);
    const open = equityAt(today - DAY_HOURS * HOUR);
    const dayReturn = close && open ? (close / open - 1) * 100 : 0;

    // « all time » cumulé jusqu'à minuit aujourd'hui (une fois par jour, enregistré en base)
    let allTime = book.stats!.allTime;
    const since = book.stats!.allTimeAt ? floorDay(Date.parse(book.stats!.allTimeAt)) : null;
    if (allTime !== null && since !== null && since < today && close) {
      const from = equityAt(since);
      // (point de départ disparu de l'historique : on repart d'aujourd'hui sans changer le chiffre)
      if (from) allTime = ((1 + allTime / 100) * (close / from) - 1) * 100;
      await rollAllTime(book.id, allTime, new Date(today).toISOString());
    }

    result.set(book.id, {
      dayReturn,
      allTime,
      weekReturn: (last.equity / base - 1) * 100,
      week: week.map((value) => (value / base - 1) * 100),
      updatedAt: new Date(last.at).toISOString(),
    });
  }
  return result;
}
