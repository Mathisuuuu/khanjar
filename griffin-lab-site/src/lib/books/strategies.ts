import "server-only";
import { randomUUID } from "node:crypto";
import { getDb, iso, isUuid, type Queryable } from "@/lib/db";
import type { NewAttachment } from "@/lib/research/repository";
import type { Attachment, AttachmentKind } from "@/lib/research/types";

/**
 * Contenu des books : la stratégie apportée par chaque membre (table
 * `book_strategies`, une par membre et par book) et ses fichiers (rapport,
 * code, données). Le contenu des fichiers n'est lu que par `readStrategyFile`.
 */

export type BookStrategy = {
  id: string;
  bookId: string;
  userKey: string;
  proposalId: string | null;
  title: string;
  market: string;
  summary: string;
  report: string;
  files: Attachment[];
  updatedAt: string;
};

export type StrategyContent = Pick<BookStrategy, "proposalId" | "title" | "market" | "summary" | "report">;

type StrategyRow = {
  id: string;
  book_id: string;
  user_key: string;
  proposal_id: string | null;
  title: string;
  market: string;
  summary: string;
  report: string;
  updated_at: Date;
};
type FileRow = { id: string; strategy_id: string; name: string; size: number; mime: string; kind: AttachmentKind };

const FILE_COLUMNS = "f.id, f.strategy_id, f.name, f.size, f.mime, f.kind";

const toFile = (row: FileRow): Attachment => ({
  id: row.id,
  name: row.name,
  size: Number(row.size),
  mime: row.mime,
  kind: row.kind,
});

/** Stratégies déposées dans un book, avec la liste de leurs fichiers. */
export async function listStrategies(bookId: string): Promise<BookStrategy[]> {
  if (!isUuid(bookId)) return [];
  const db = await getDb();
  const [rows, files] = await Promise.all([
    db.query<StrategyRow>("SELECT * FROM book_strategies WHERE book_id = $1", [bookId]),
    db.query<FileRow>(
      `SELECT ${FILE_COLUMNS} FROM book_strategy_files f
       JOIN book_strategies s ON s.id = f.strategy_id
       WHERE s.book_id = $1 ORDER BY f.position`,
      [bookId],
    ),
  ]);
  return rows.map((row) => ({
    id: row.id,
    bookId: row.book_id,
    userKey: row.user_key,
    proposalId: row.proposal_id,
    title: row.title,
    market: row.market,
    summary: row.summary,
    report: row.report,
    files: files.filter((f) => f.strategy_id === row.id).map(toFile),
    updatedAt: iso(row.updated_at),
  }));
}

async function insertFiles(db: Queryable, strategyId: string, files: NewAttachment[]) {
  const [{ next }] = await db.query<{ next: number }>(
    "SELECT coalesce(max(position) + 1, 0)::int AS next FROM book_strategy_files WHERE strategy_id = $1",
    [strategyId],
  );
  for (const [index, { data, ...meta }] of files.entries()) {
    await db.query(
      `INSERT INTO book_strategy_files (id, strategy_id, position, name, size, mime, kind, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [randomUUID(), strategyId, Number(next) + index, meta.name, meta.size, meta.mime, meta.kind, data],
    );
  }
}

/** Crée ou met à jour la stratégie d'un membre, retire et ajoute des fichiers. */
export async function saveStrategy(
  bookId: string,
  userKey: string,
  content: StrategyContent,
  removeIds: string[],
  files: NewAttachment[],
): Promise<void> {
  if (!isUuid(bookId)) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [row] = await tx.query<{ id: string }>(
      `INSERT INTO book_strategies (id, book_id, user_key, proposal_id, title, market, summary, report)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (book_id, user_key) DO UPDATE SET
         proposal_id = EXCLUDED.proposal_id, title = EXCLUDED.title, market = EXCLUDED.market,
         summary = EXCLUDED.summary, report = EXCLUDED.report, updated_at = now()
       RETURNING id`,
      [randomUUID(), bookId, userKey, content.proposalId, content.title, content.market, content.summary, content.report],
    );
    const ids = removeIds.filter(isUuid);
    if (ids.length) {
      await tx.query("DELETE FROM book_strategy_files WHERE strategy_id = $1 AND id = ANY($2::uuid[])", [row.id, ids]);
    }
    if (files.length) await insertFiles(tx, row.id, files);
  });
}

/** Fichiers déjà joints à la stratégie d'un membre (limite par stratégie). */
export async function strategyFileIds(bookId: string, userKey: string): Promise<{ id: string }[]> {
  if (!isUuid(bookId)) return [];
  const db = await getDb();
  return db.query<{ id: string }>(
    `SELECT f.id FROM book_strategy_files f JOIN book_strategies s ON s.id = f.strategy_id
     WHERE s.book_id = $1 AND s.user_key = $2`,
    [bookId, userKey],
  );
}

/** Un fichier, son book et son contenu (téléchargement). */
export async function readStrategyFile(
  id: string,
): Promise<{ bookId: string; ownerKey: string; file: Attachment; data: Buffer } | null> {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [row] = await db.query<FileRow & { book_id: string; user_key: string; data: Uint8Array }>(
    `SELECT ${FILE_COLUMNS}, f.data, s.book_id, s.user_key FROM book_strategy_files f
     JOIN book_strategies s ON s.id = f.strategy_id WHERE f.id = $1`,
    [id],
  );
  return row ? { bookId: row.book_id, ownerKey: row.user_key, file: toFile(row), data: Buffer.from(row.data) } : null;
}

/**
 * Fiche créée à partir d'une proposition (placement depuis l'administration).
 * Si le membre avait déjà une fiche sans proposition liée, on la relie ; sinon on n'y touche pas.
 */
export async function strategyFromProposal(
  bookId: string,
  userKey: string,
  proposal: { id: string; title: string; market: string; description: string },
): Promise<void> {
  if (!isUuid(bookId)) return;
  const db = await getDb();
  await db.query(
    `INSERT INTO book_strategies (id, book_id, user_key, proposal_id, title, market, summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (book_id, user_key) DO UPDATE SET proposal_id = EXCLUDED.proposal_id, updated_at = now()
       WHERE book_strategies.proposal_id IS NULL`,
    [randomUUID(), bookId, userKey, proposal.id, proposal.title, proposal.market, proposal.description],
  );
}
