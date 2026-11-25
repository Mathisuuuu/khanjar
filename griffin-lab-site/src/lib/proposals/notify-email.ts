import "server-only";
import { certificateImage } from "@/lib/certificates/certificate";
import { getCertificate } from "@/lib/certificates/settings";
import { getDb } from "@/lib/db";
import { CERTIFICATE_CID, proposalEmail } from "@/lib/email/proposal-email";
import { canSendMail, sendMail, type MailAttachment } from "@/lib/email/mailer";
import { isLocale, type Locale } from "@/lib/i18n/core";
import type { Proposal, ProposalStatus } from "@/lib/proposals/types";
import { getUserRepository } from "@/lib/users/repository";

/**
 * Suivi des propositions par e-mail : un message à l'auteur à chaque étape
 * (reçue, de nouveau en file, en test, validée avec son certificat, refusée
 * avec le motif). L'adresse est retenue au dépôt de la proposition ; pour un
 * compte e-mail, celle du compte sert aussi pour les propositions plus anciennes.
 * Une erreur d'envoi ne bloque jamais le site.
 */

/** Retient l'adresse (et la langue) de l'auteur, au dépôt d'une proposition. */
export async function rememberAuthorEmail(userKey: string, email: string | null, locale: Locale): Promise<void> {
  const address = email?.trim().toLowerCase();
  if (!address || !address.includes("@") || address.length > 254) return;
  const db = await getDb();
  await db.query(
    `INSERT INTO notification_emails (user_key, email, locale) VALUES ($1, $2, $3)
     ON CONFLICT (user_key) DO UPDATE SET email = EXCLUDED.email, locale = EXCLUDED.locale, updated_at = now()`,
    [userKey, address, locale],
  );
}

async function recipient(userKey: string): Promise<{ email: string; locale: Locale } | null> {
  const db = await getDb();
  const [row] = await db.query<{ email: string; locale: string }>("SELECT email, locale FROM notification_emails WHERE user_key = $1", [userKey]);
  if (row) return { email: row.email, locale: isLocale(row.locale) ? row.locale : "fr" };
  // compte e-mail sans adresse retenue (proposition déposée avant cette fonction) : l'adresse du compte
  if (userKey.startsWith("credentials:")) {
    const user = await getUserRepository().findById(userKey.slice("credentials:".length));
    if (user?.email) return { email: user.email, locale: "fr" };
  }
  return null;
}

/** `before` : statut d'avant, `null` pour une proposition qui vient d'être déposée. */
export async function emailProposalChange(proposal: Proposal, before: ProposalStatus | null): Promise<void> {
  if (before === proposal.status || !canSendMail()) return;
  try {
    const to = await recipient(proposal.authorId);
    if (!to) return;

    let attachments: MailAttachment[] | undefined;
    let score = proposal.score ?? null;
    if (proposal.status === "validated") {
      const certificate = await getCertificate(proposal.id);
      if (certificate) {
        score = certificate.score;
        try {
          const image = await certificateImage(certificate);
          attachments = [{ filename: "fleija-certificate.png", content: image, contentType: "image/png", cid: CERTIFICATE_CID }];
        } catch (error) {
          // sans image, l'e-mail part quand même et renvoie vers la page compte
          console.error("Certificat non joint à l'e-mail :", error instanceof Error ? error.message : error);
        }
      }
    }

    const mail = proposalEmail(
      {
        name: proposal.pseudo,
        title: proposal.title,
        type: proposal.type,
        status: proposal.status,
        before,
        reason: proposal.reason,
        score,
        withCertificate: !!attachments,
      },
      to.locale,
    );
    await sendMail({ to: to.email, ...mail, attachments });
  } catch (error) {
    console.error("Suivi de proposition non envoyé par e-mail :", error instanceof Error ? error.message : error);
  }
}
