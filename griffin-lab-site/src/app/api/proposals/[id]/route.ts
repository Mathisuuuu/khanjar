import { after, NextResponse } from "next/server";
import { proposalChanged } from "@/lib/discord/proposal-events";
import { readJson } from "@/lib/security/read-json";
import { isModeratorRequest } from "@/lib/proposals/auth";
import { getProposalRepository } from "@/lib/proposals/repository";
import { fieldErrors, moderationSchema } from "@/lib/proposals/schema";
import { toPublic } from "@/lib/proposals/types";

export const dynamic = "force-dynamic";

/** PATCH /api/proposals/:id : change le statut (réservé à la modération). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isModeratorRequest(request))) {
    return NextResponse.json({ error: "Jeton de modération manquant ou invalide." }, { status: 401 });
  }

  const body = await readJson(request); // 128 Ko au plus
  if (body === undefined) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const parsed = moderationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valeurs invalides.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }

  const { id } = await params;
  const repository = getProposalRepository();
  const before = (await repository.list()).find((p) => p.id === id);
  const proposal = await repository.moderate(id, parsed.data);
  if (!proposal) {
    return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 });
  }
  // Discord (compteur, verdict, message privé à l'auteur), seulement si le statut change vraiment
  if (before?.status !== proposal.status) after(() => proposalChanged(proposal, before?.status ?? "pending"));
  return NextResponse.json({ proposal: toPublic(proposal) });
}
