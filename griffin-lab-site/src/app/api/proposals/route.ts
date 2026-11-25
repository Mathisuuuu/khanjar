import { after, NextResponse } from "next/server";
import { proposalChanged } from "@/lib/discord/proposal-events";
import { isAdminRequest, isModeratorRequest } from "@/lib/proposals/auth";
import { getLocale } from "@/lib/i18n/server";
import { getCurrentAuthor } from "@/lib/proposals/author";
import { rememberAuthorEmail } from "@/lib/proposals/notify-email";
import { getProposalRepository } from "@/lib/proposals/repository";
import { fieldErrors, newProposalSchema } from "@/lib/proposals/schema";
import { toPublic } from "@/lib/proposals/types";
import { consume } from "@/lib/security/rate-limit";
import { readJson } from "@/lib/security/read-json";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Connecte-toi pour accéder à tes propositions." }, { status: 401 });

/**
 * GET /api/proposals
 * - avec le jeton de modération : toutes les propositions ;
 * - sinon : uniquement celles de l'utilisateur connecté (401 sans session).
 * Le code des stratégies n'est jamais renvoyé.
 */
export async function GET(request: Request) {
  const repository = getProposalRepository();
  // la liste complète : avec le jeton, ou pour un administrateur qui la demande (?tout=1, page /moderation)
  const wantsAll = new URL(request.url).searchParams.get("tout") === "1";
  if (isAdminRequest(request) || (wantsAll && (await isModeratorRequest(request)))) {
    return NextResponse.json({ proposals: (await repository.list()).map(toPublic) });
  }

  const author = await getCurrentAuthor();
  if (!author) return unauthorized();
  const proposals = await repository.listByAuthor(author.id);
  return NextResponse.json({ proposals: proposals.map(toPublic) });
}

/** POST /api/proposals : dépôt d'une proposition, rattachée au compte connecté. */
export async function POST(request: Request) {
  const author = await getCurrentAuthor();
  if (!author) return unauthorized();
  if (!author.hasPseudo) return NextResponse.json({ error: "Choisis d'abord ton pseudo." }, { status: 403 });
  if (!(await consume(`proposal:${author.id}`, 10, 60 * 60))) {
    return NextResponse.json({ error: "Trop de propositions d'un coup. Réessaie dans une heure." }, { status: 429 });
  }

  const body = await readJson(request); // 128 Ko au plus
  if (body === undefined) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const parsed = newProposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Certains champs sont invalides.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }

  const proposal = await getProposalRepository().create(parsed.data, author);
  const locale = await getLocale();
  // après la réponse : adresse de suivi retenue, puis compteur Discord, message privé et e-mail à l'auteur
  after(async () => {
    await rememberAuthorEmail(author.id, author.email, locale).catch((error) =>
      console.error("Adresse de suivi non enregistrée :", error instanceof Error ? error.message : error),
    );
    await proposalChanged(proposal, null);
  });
  return NextResponse.json({ proposal: toPublic(proposal) }, { status: 201 });
}
