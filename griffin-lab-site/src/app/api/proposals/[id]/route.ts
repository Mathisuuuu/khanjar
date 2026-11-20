import { NextResponse } from "next/server";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = moderationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valeurs invalides.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }

  const { id } = await params;
  const proposal = await getProposalRepository().moderate(id, parsed.data);
  if (!proposal) {
    return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 });
  }
  return NextResponse.json({ proposal: toPublic(proposal) });
}
