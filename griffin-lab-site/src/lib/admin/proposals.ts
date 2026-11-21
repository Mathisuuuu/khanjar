import "server-only";
import { listBooks } from "@/lib/books/repository";
import { getDb } from "@/lib/db";
import { getProposalRepository } from "@/lib/proposals/repository";
import type { Proposal, ProposalStatus } from "@/lib/proposals/types";
import { profileHref } from "@/lib/users/identity";

/**
 * Vue administrateur des propositions : chaque proposition avec son auteur
 * (pseudo actuel) et les books dont l'auteur fait partie.
 */

export type Placement = { bookId: string; name: string; color: string; linked: boolean };

export type AdminProposal = Proposal & {
  author: { pseudo: string; href: string | null; banned: boolean };
  placements: Placement[];
};

export type ProposalFilter = ProposalStatus | "all" | "unplaced";

export async function listAdminProposals(): Promise<{ proposals: AdminProposal[]; books: { id: string; name: string; color: string }[] }> {
  const db = await getDb();
  const [proposals, books] = await Promise.all([getProposalRepository().list(), listBooks()]);
  const authors = [...new Set(proposals.map((p) => p.authorId))];

  const [profiles, members, links, bans] = authors.length
    ? await Promise.all([
        db.query<{ user_key: string; pseudo: string }>("SELECT user_key, pseudo FROM profiles WHERE user_key = ANY($1)", [authors]),
        db.query<{ user_key: string; book_id: string }>("SELECT user_key, book_id FROM book_members WHERE user_key = ANY($1)", [authors]),
        db.query<{ proposal_id: string; book_id: string }>(
          "SELECT proposal_id, book_id FROM book_strategies WHERE proposal_id IS NOT NULL AND user_key = ANY($1)",
          [authors],
        ),
        db.query<{ user_key: string }>("SELECT user_key FROM banned_accounts WHERE user_key = ANY($1)", [authors]),
      ])
    : [[], [], [], []];

  const pseudoOf = new Map(profiles.map((p) => [p.user_key, p.pseudo]));
  const bookOf = new Map(books.map((b) => [b.id, b]));
  const banned = new Set(bans.map((b) => b.user_key));

  return {
    books: books.map(({ id, name, color }) => ({ id, name, color })),
    proposals: proposals.map((p) => {
      const pseudo = pseudoOf.get(p.authorId);
      return {
        ...p,
        author: { pseudo: pseudo ?? p.pseudo, href: pseudo ? profileHref(pseudo) : null, banned: banned.has(p.authorId) },
        placements: members
          .filter((m) => m.user_key === p.authorId && bookOf.has(m.book_id))
          .map((m) => {
            const book = bookOf.get(m.book_id)!;
            return {
              bookId: book.id,
              name: book.name,
              color: book.color,
              linked: links.some((l) => l.proposal_id === p.id && l.book_id === book.id),
            };
          }),
      };
    }),
  };
}

/** Une proposition validée est « à placer » tant qu'aucune fiche de book n'y est liée. */
export const isUnplaced = (p: AdminProposal) => p.status === "validated" && !p.placements.some((b) => b.linked);
