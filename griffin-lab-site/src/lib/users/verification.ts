import "server-only";
import type { Queryable } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";
import { checkCode, consumeLinkToken, issueCode, siteUrl } from "./email-codes";
import { verificationEmail } from "@/lib/email/code-email";

/**
 * Vérification de l'adresse e-mail des comptes e-mail + mot de passe :
 * un code à 6 chiffres (30 minutes, 5 essais) et un lien (24 heures).
 */

const LINK_HOURS = 24;
const CODE_MINUTES = 30;

async function markVerified(tx: Queryable, userId: string) {
  await tx.query("UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1", [userId]);
}

/** Crée un nouveau code et un nouveau lien (les anciens sont annulés) et envoie l'e-mail. */
export async function sendVerificationEmail(user: { id: string; email: string; name: string }): Promise<void> {
  const { code, token } = await issueCode(user.id, "verify", { codeMinutes: CODE_MINUTES, linkHours: LINK_HOURS });
  const link = `${await siteUrl()}/verify?token=${token}`;
  await sendMail({
    to: user.email,
    ...verificationEmail({ name: user.name, code, link, codeMinutes: CODE_MINUTES, linkHours: LINK_HOURS }),
  });
}

export type CodeResult = "ok" | "wrong" | "expired";

/** Vérifie le code saisi sur /verify. */
export async function confirmEmailCode(email: string, code: string): Promise<CodeResult> {
  return (await checkCode(email, "verify", code, markVerified)).status;
}

/** Valide le lien reçu par e-mail. Renvoie `false` si le lien est invalide ou expiré. */
export async function confirmEmailToken(token: string): Promise<boolean> {
  return consumeLinkToken(token, "verify", markVerified);
}
