import "server-only";
import { randomUUID } from "node:crypto";
import { getDb, iso, isUuid } from "@/lib/db";
import type { Viewer } from "@/lib/viewer";

/**
 * Books : des cercles privés créés par l'équipe Griffin Lab. Chaque book a sa
 * couleur et ses membres ; seuls ses membres (et l'équipe) voient son canevas.
 */

export type Book = {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  createdAt: string;
  /** Lettre du book sur l'accueil (A, B, C), s'il y figure. */
  letter: string | null;
  /** Chiffres affichés sur l'accueil et au survol du book. */
  stats: BookStats | null;
};

export type BookStats = { strategies: number; sharpe: number; maxDrawdown: number; monthReturn: number };

type BookRow = {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: Date;
  members: number;
  letter: string | null;
  strategies: number | null;
  sharpe: string | number | null;
  max_drawdown: string | number | null;
  month_return: string | number | null;
};

const toBook = (row: BookRow): Book => ({
  id: row.id,
  name: row.name,
  description: row.description,
  color: row.color,
  memberCount: Number(row.members ?? 0),
  createdAt: iso(row.created_at),
  letter: row.letter,
  // les quatre chiffres vont ensemble : sans l'un d'eux, pas de statistiques
  stats:
    row.strategies === null || row.sharpe === null || row.max_drawdown === null || row.month_return === null
      ? null
      : {
          strategies: Number(row.strategies),
          sharpe: Number(row.sharpe),
          maxDrawdown: Number(row.max_drawdown),
          monthReturn: Number(row.month_return),
        },
});

const BOOK_SELECT = `SELECT b.id, b.name, b.description, b.color, b.created_at,
  b.letter, b.strategies, b.sharpe, b.max_drawdown, b.month_return,
  (SELECT count(*)::int FROM book_members m WHERE m.book_id = b.id) AS members
  FROM books b`;

export async function listBooks(): Promise<Book[]> {
  const db = await getDb();
  return (await db.query<BookRow>(`${BOOK_SELECT} ORDER BY b.name`)).map(toBook);
}

export async function getBook(id: string): Promise<Book | null> {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [row] = await db.query<BookRow>(`${BOOK_SELECT} WHERE b.id = $1`, [id]);
  return row ? toBook(row) : null;
}

/** Books dont `userKey` est membre. */
export async function listBooksOf(userKey: string): Promise<Book[]> {
  const db = await getDb();
  const rows = await db.query<BookRow>(
    `${BOOK_SELECT} WHERE EXISTS (SELECT 1 FROM book_members m WHERE m.book_id = b.id AND m.user_key = $1) ORDER BY b.name`,
    [userKey],
  );
  return rows.map(toBook);
}

/** Membres d'un book (hors comptes bannis), du plus ancien au plus récent. */
export async function listBookMembers(bookId: string): Promise<string[]> {
  if (!isUuid(bookId)) return [];
  const db = await getDb();
  const rows = await db.query<{ user_key: string }>(
    `SELECT m.user_key FROM book_members m
     WHERE m.book_id = $1 AND NOT EXISTS (SELECT 1 FROM banned_accounts b WHERE b.user_key = m.user_key)
     ORDER BY m.added_at`,
    [bookId],
  );
  return rows.map((row) => row.user_key);
}

export async function isBookMember(bookId: string, userKey: string): Promise<boolean> {
  if (!isUuid(bookId)) return false;
  const db = await getDb();
  return (await db.query("SELECT 1 FROM book_members WHERE book_id = $1 AND user_key = $2", [bookId, userKey])).length > 0;
}

/** L'équipe (et les admins) voit tous les books ; les autres, seulement ceux dont ils sont membres. */
/**
 * Tout compte connecté peut voir un book (cercles, chiffres). Être membre
 * compte pour l'anonymat : un profil « anonyme hors de mes books » n'est
 * nommé que pour les membres d'un book qu'il partage.
 */
export async function canAccessBook(_bookId: string, viewer: Viewer | null): Promise<boolean> {
  return !!viewer;
}

/**
 * Accès au contenu d'un book (stratégies, rapports, code, fichiers) :
 * - `all` : un administrateur, ou un membre qu'un administrateur a autorisé ;
 * - `own` : un membre non autorisé, qui ne voit que sa propre stratégie ;
 * - `none` : tous les autres (visiteurs, comptes hors du book, équipe non admin).
 * Par défaut un membre n'est pas autorisé : la case est décochée.
 */
export type ContentAccess = "all" | "own" | "none";

export async function contentAccess(bookId: string, viewer: Viewer | null): Promise<ContentAccess> {
  if (!viewer || !isUuid(bookId)) return "none";
  if (viewer.isAdmin) return "all";
  const db = await getDb();
  const [row] = await db.query<{ can_view_strategies: boolean }>(
    "SELECT can_view_strategies FROM book_members WHERE book_id = $1 AND user_key = $2",
    [bookId, viewer.id],
  );
  if (!row) return "none";
  return row.can_view_strategies === true ? "all" : "own";
}

/** Membres autorisés à voir les stratégies d'un book (gestion par un administrateur). */
export async function strategyViewers(bookId: string): Promise<Set<string>> {
  if (!isUuid(bookId)) return new Set();
  const db = await getDb();
  const rows = await db.query<{ user_key: string }>(
    "SELECT user_key FROM book_members WHERE book_id = $1 AND can_view_strategies = true",
    [bookId],
  );
  return new Set(rows.map((r) => r.user_key));
}

export async function setStrategyAccess(bookId: string, userKey: string, allowed: boolean): Promise<boolean> {
  if (!isUuid(bookId)) return false;
  const db = await getDb();
  const rows = await db.query("UPDATE book_members SET can_view_strategies = $3 WHERE book_id = $1 AND user_key = $2 RETURNING 1", [
    bookId,
    userKey,
    allowed,
  ]);
  return rows.length > 0;
}

export async function createBook(input: { name: string; description: string; color: string; createdBy: string }): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.query("INSERT INTO books (id, name, description, color, created_by) VALUES ($1, $2, $3, $4, $5)", [
    id,
    input.name,
    input.description,
    input.color,
    input.createdBy,
  ]);
  return id;
}

export async function updateBook(
  id: string,
  input: { name: string; description: string; color: string; stats: BookStats | null },
): Promise<void> {
  if (!isUuid(id)) return;
  const db = await getDb();
  await db.query(
    `UPDATE books SET name = $2, description = $3, color = $4,
       strategies = $5, sharpe = $6, max_drawdown = $7, month_return = $8
     WHERE id = $1`,
    [
      id,
      input.name,
      input.description,
      input.color,
      input.stats?.strategies ?? null,
      input.stats?.sharpe ?? null,
      input.stats?.maxDrawdown ?? null,
      input.stats?.monthReturn ?? null,
    ],
  );
}

/** Books affichés sur l'accueil (ceux qui ont une lettre), dans l'ordre A, B, C. */
export async function listHomeBooks(): Promise<Book[]> {
  const db = await getDb();
  return (await db.query<BookRow>(`${BOOK_SELECT} WHERE b.letter IS NOT NULL ORDER BY b.letter`)).map(toBook);
}

export async function deleteBook(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const db = await getDb();
  await db.query("DELETE FROM books WHERE id = $1", [id]); // les membres suivent (ON DELETE CASCADE)
}

export async function addBookMember(bookId: string, userKey: string): Promise<void> {
  if (!isUuid(bookId)) return;
  const db = await getDb();
  await db.query("INSERT INTO book_members (book_id, user_key) VALUES ($1, $2) ON CONFLICT DO NOTHING", [bookId, userKey]);
}

export async function removeBookMember(bookId: string, userKey: string): Promise<void> {
  if (!isUuid(bookId)) return;
  const db = await getDb();
  // quitter un book retire aussi la stratégie et les fichiers qu'on y avait déposés
  await db.transaction(async (tx) => {
    await tx.query("DELETE FROM book_strategies WHERE book_id = $1 AND user_key = $2", [bookId, userKey]);
    await tx.query("DELETE FROM book_members WHERE book_id = $1 AND user_key = $2", [bookId, userKey]);
  });
}

/** Pour chaque compte, les groupes de recherche où il a publié. */
export async function contributionsOf(userKeys: string[]): Promise<{ userKey: string; groupId: string }[]> {
  if (userKeys.length === 0) return [];
  const db = await getDb();
  const rows = await db.query<{ author_id: string; group_id: string }>(
    "SELECT DISTINCT author_id, group_id FROM research_posts WHERE author_id = ANY($1)",
    [userKeys],
  );
  return rows.map((row) => ({ userKey: row.author_id, groupId: row.group_id }));
}
