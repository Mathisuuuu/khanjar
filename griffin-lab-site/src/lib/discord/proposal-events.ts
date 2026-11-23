import "server-only";
import { announceProposalStatus, plain } from "@/lib/discord/announce";
import { sendCertificate } from "@/lib/discord/certificate";
import { STATUS_COLORS, botConfigured, fleijaEmbed, linkButton, openDm, postMessage, siteUrl } from "@/lib/discord/dm";
import type { Proposal, ProposalStatus, ProposalType } from "@/lib/proposals/types";

/**
 * Ce que Discord fait quand une proposition change de statut :
 * - #strategy-counter : compteur remis à jour, verdict annoncé (validée ou refusée) ;
 * - message privé à l'auteur à chaque étape (reçue, en test, validée avec son
 *   certificat, refusée avec le motif), s'il a un compte Discord connu du site.
 * À lancer après la réponse (`after`) : une erreur Discord ne bloque jamais le site.
 */

const kinds: Record<ProposalType, string> = { idea: "strategy idea", script: "strategy", paper: "paper" };

/** Encadré du message privé de suivi, ou `null` (validée : le message part avec le certificat). */
function progressEmbed(proposal: Proposal, before: ProposalStatus | null) {
  const kind = kinds[proposal.type] ?? "proposal";
  const base = { title: plain(proposal.title, 200), url: `${siteUrl()}/account#activite` };
  switch (proposal.status) {
    case "pending":
      return fleijaEmbed({
        ...base,
        color: STATUS_COLORS.pending,
        description:
          before === null
            ? `📥 We received your ${kind}. It's in the queue: you'll get a message here at each step.`
            : `🟡 Your ${kind} is back in the queue.`,
      });
    case "testing":
      return fleijaEmbed({ ...base, color: STATUS_COLORS.testing, description: `🔵 Your ${kind} is now going through the test script.` });
    case "rejected": {
      const reason = proposal.reason ? `

**Reason:** ${plain(proposal.reason, 600)}` : "";
      return fleijaEmbed({
        ...base,
        color: STATUS_COLORS.rejected,
        description: `🔴 Your ${kind} did not pass the checks and was not validated.${reason}

You can improve it and submit it again.`,
      });
    }
    default:
      return null;
  }
}

async function notifyAuthor(proposal: Proposal, before: ProposalStatus | null): Promise<void> {
  if (proposal.status === "validated") return sendCertificate(proposal);
  const embed = progressEmbed(proposal, before);
  if (!embed || !botConfigured()) return;
  const button =
    proposal.status === "rejected"
      ? linkButton("Submit again", `${siteUrl()}/submit`)
      : linkButton("Follow it on Fleija", `${siteUrl()}/account#activite`);
  try {
    const dm = await openDm(proposal.authorId);
    if (dm) await postMessage(dm, { embeds: [embed], components: [button] });
  } catch (error) {
    console.error("Suivi de proposition non envoyé sur Discord :", error instanceof Error ? error.message : error);
  }
}

/** `before` : statut d'avant, `null` pour une proposition qui vient d'être déposée. */
export async function proposalChanged(proposal: Proposal, before: ProposalStatus | null): Promise<void> {
  if (before === proposal.status) return;
  await Promise.all([announceProposalStatus(proposal.status), notifyAuthor(proposal, before)]);
}
