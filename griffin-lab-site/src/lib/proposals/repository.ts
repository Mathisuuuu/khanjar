import "server-only";
import { randomUUID } from "node:crypto";
import { getDb, iso, isUuid, optional } from "@/lib/db";
import type { Author } from "./author";
import type { ModerationInput, NewProposal } from "./schema";
import type { Proposal, ProposalStatus, ProposalType } from "./types";

/** Accès aux propositions (table `proposals`). */
export interface ProposalRepository {
  /** Toutes les propositions (modération uniquement). */
  list(): Promise<Proposal[]>;
  /** Les propositions d'un seul auteur. */
  listByAuthor(authorId: string): Promise<Proposal[]>;
  create(input: NewProposal, author: Author): Promise<Proposal>;
  moderate(id: string, input: ModerationInput): Promise<Proposal | null>;
}

type ProposalRow = {
  id: string;
  author_id: string;
  type: ProposalType;
  pseudo: string;
  market: string;
  title: string;
  description: string;
  code: string | null;
  paper_title: string | null;
  paper_authors: string | null;
  paper_url: string | null;
  status: ProposalStatus;
  score: number | null;
  reason: string | null;
  created_at: Date;
  updated_at: Date;
};

const toProposal = (row: ProposalRow): Proposal => ({
  id: row.id,
  authorId: row.author_id,
  type: row.type,
  pseudo: row.pseudo,
  market: row.market,
  title: row.title,
  description: row.description,
  code: optional(row.code),
  paper:
    row.type === "paper"
      ? { title: row.paper_title ?? "", authors: row.paper_authors ?? "", url: row.paper_url ?? "" }
      : undefined,
  status: row.status,
  score: optional(row.score),
  reason: optional(row.reason),
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

class PostgresProposalRepository implements ProposalRepository {
  async list() {
    const db = await getDb();
    return (await db.query<ProposalRow>("SELECT * FROM proposals ORDER BY created_at DESC")).map(toProposal);
  }

  async listByAuthor(authorId: string) {
    const db = await getDb();
    const rows = await db.query<ProposalRow>(
      "SELECT * FROM proposals WHERE author_id = $1 ORDER BY created_at DESC",
      [authorId],
    );
    return rows.map(toProposal);
  }

  async create(input: NewProposal, author: Author) {
    const db = await getDb();
    const isPaper = input.type === "paper";
    const [row] = await db.query<ProposalRow>(
      `INSERT INTO proposals (id, author_id, type, pseudo, market, title, description, code, paper_title, paper_authors, paper_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        randomUUID(),
        author.id,
        input.type,
        input.pseudo || author.name,
        input.market,
        input.title,
        input.description,
        input.type === "script" ? input.code : null,
        isPaper ? input.paperTitle : null,
        isPaper ? input.paperAuthors : null,
        isPaper ? input.paperUrl : null,
      ],
    );
    return toProposal(row);
  }

  async moderate(id: string, input: ModerationInput) {
    if (!isUuid(id)) return null;
    const db = await getDb();
    const [row] = await db.query<ProposalRow>(
      `UPDATE proposals SET status = $2, score = $3, reason = $4, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, input.status, input.score ?? null, input.reason || null],
    );
    return row ? toProposal(row) : null;
  }
}

let repository: ProposalRepository | undefined;

export function getProposalRepository(): ProposalRepository {
  repository ??= new PostgresProposalRepository();
  return repository;
}
