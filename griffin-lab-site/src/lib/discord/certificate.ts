import "server-only";
import { certificateImage } from "@/lib/certificates/certificate";
import { getCertificate, type Certificate } from "@/lib/certificates/settings";
import { channelId, plain } from "@/lib/discord/announce";
import { botConfigured, fleijaEmbed, linkButton, openDm, postMessage, siteUrl } from "@/lib/discord/dm";
import type { Proposal } from "@/lib/proposals/types";

/**
 * Certificats sur Discord, envoyés par le bot :
 * - en message privé à l'auteur dès que sa stratégie est validée (il faut un
 *   compte Discord, être sur le serveur et accepter les messages privés) ;
 * - dans #certificates quand l'auteur choisit de le publier depuis /account.
 * Une erreur d'envoi privé ne fait jamais échouer la validation.
 */

export const CERTIFICATE_CHANNEL = "certificates";
const FILENAME = "fleija-certificate.png";

/** Message privé à l'auteur, au passage de sa proposition en « validée ». */
export async function sendCertificate(proposal: Proposal): Promise<void> {
  if (!botConfigured()) return;
  try {
    const [dm, certificate] = await Promise.all([openDm(proposal.authorId), getCertificate(proposal.id)]);
    if (!dm || !certificate) return;
    const score = certificate.score === null ? "" : ` with a score of **${certificate.score}/100**`;
    await postMessage(
      dm,
      {
        embeds: [
          fleijaEmbed({
            title: plain(certificate.title, 200),
            url: `${siteUrl()}/account#certificats`,
            description:
              `🟢 Congratulations! Your proposal passed every check and was validated${score}.

` +
              `Here is your Fleija certificate. Download it, show it on your public profile or share it in #${CERTIFICATE_CHANNEL} from your account page.`,
            image: `attachment://${FILENAME}`,
          }),
        ],
        components: [linkButton("Open my account", `${siteUrl()}/account#certificats`)],
      },
      { data: await certificateImage(certificate), filename: FILENAME },
    );
  } catch (error) {
    console.error("Certificat non envoyé sur Discord :", error instanceof Error ? error.message : error);
  }
}

/** Publication dans #certificates, à la demande de l'auteur. Lève une erreur si l'envoi échoue. */
export async function postCertificate(certificate: Certificate, name: string): Promise<void> {
  if (!botConfigured()) throw new Error("bot Discord non configuré");
  const channel = await channelId(CERTIFICATE_CHANNEL);
  if (!channel) throw new Error(`#${CERTIFICATE_CHANNEL} introuvable`);
  const score = certificate.score === null ? "" : ` with a score of **${certificate.score}/100**`;
  await postMessage(
    channel,
    {
      embeds: [
        fleijaEmbed({
          description: `🎓 **${plain(name, 40)}** earned a Fleija certificate: their strategy was validated${score}. Congratulations!`,
          image: `attachment://${FILENAME}`,
        }),
      ],
    },
    { data: await certificateImage(certificate), filename: FILENAME },
  );
}
