"use server";

import { revalidatePath } from "next/cache";
import { deleteProposal } from "@/lib/admin/repository";
import { addBookMember, getBook, removeBookMember } from "@/lib/books/repository";
import { strategyFromProposal } from "@/lib/books/strategies";
import { getProposalRepository } from "@/lib/proposals/repository";
import { moderationSchema } from "@/lib/proposals/schema";
import type { ProposalStatus } from "@/lib/proposals/types";
import { getViewer } from "@/lib/viewer";

/**
 * Actions de la page « Propositions » de l'administration. Chacune revérifie
 * que la personne est administrateur. Elles renvoient un message affichable.
 */

export type AdminResult = { ok: boolean; message: string };

async function adminOnly() {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) throw new Error("Réservé aux administrateurs.");
  return viewer;
}

async function findProposal(id: string) {
  return (await getProposalRepository().list()).find((p) => p.id === id) ?? null;
}

function refresh(bookIds: string[] = []) {
  revalidatePath("/admin/propositions");
  revalidatePath("/admin");
  revalidatePath("/proposer");
  revalidatePath("/compte");
  revalidatePath("/books", "layout");
  for (const id of bookIds) revalidatePath(`/books/${id}`);
}

const statusMessages: Record<ProposalStatus, string> = {
  pending: "Remise en file.",
  testing: "Passée en test.",
  validated: "Validée.",
  rejected: "Refusée.",
};

/** Change le statut, le score et l'avis (raison) d'une proposition. */
export async function moderateAction(
  id: string,
  input: { status: ProposalStatus; score?: number | null; reason?: string },
): Promise<AdminResult> {
  await adminOnly();
  const parsed = moderationSchema.safeParse({
    status: input.status,
    score: input.score ?? undefined,
    reason: input.reason?.trim() || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Valeurs invalides." };
  if (parsed.data.status === "rejected" && !parsed.data.reason) {
    return { ok: false, message: "Indique la raison du refus : l'auteur la verra." };
  }
  const proposal = await getProposalRepository().moderate(id, parsed.data);
  if (!proposal) return { ok: false, message: "Proposition introuvable." };
  refresh();
  return { ok: true, message: statusMessages[proposal.status] };
}

/**
 * Place l'auteur d'une proposition validée dans un book : il en devient membre
 * et sa fiche de stratégie est remplie à partir de la proposition.
 */
export async function placeInBookAction(proposalId: string, bookId: string): Promise<AdminResult> {
  await adminOnly();
  const [proposal, book] = await Promise.all([findProposal(proposalId), getBook(bookId)]);
  if (!proposal || !book) return { ok: false, message: "Proposition ou book introuvable." };
  if (proposal.status !== "validated") return { ok: false, message: "Valide d'abord la proposition." };

  await addBookMember(book.id, proposal.authorId);
  await strategyFromProposal(book.id, proposal.authorId, proposal);
  refresh([book.id]);
  return { ok: true, message: `Ajoutée à ${book.name}.` };
}

/** Retire l'auteur du book (sa fiche et ses fichiers dans ce book sont supprimés). */
export async function removeFromBookAction(proposalId: string, bookId: string): Promise<AdminResult> {
  await adminOnly();
  const [proposal, book] = await Promise.all([findProposal(proposalId), getBook(bookId)]);
  if (!proposal || !book) return { ok: false, message: "Proposition ou book introuvable." };
  await removeBookMember(book.id, proposal.authorId);
  refresh([book.id]);
  return { ok: true, message: `Retirée de ${book.name}.` };
}

export async function deleteProposalAdminAction(id: string): Promise<AdminResult> {
  await adminOnly();
  await deleteProposal(id);
  refresh();
  return { ok: true, message: "Proposition supprimée." };
}
