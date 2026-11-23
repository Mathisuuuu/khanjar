import "server-only";
import type { Queryable } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";
import { getLocale } from "@/lib/i18n/server";
import { passwordResetEmail } from "@/lib/email/code-email";
import { checkCode, consumeLinkToken, isLinkTokenValid, issueCode, siteUrl } from "./email-codes";

/**
 * Mot de passe oublié : un code à 6 chiffres (15 minutes, 5 essais) et un
 * lien (1 heure). Changer le mot de passe confirme aussi l'adresse e-mail
 * (la personne a prouvé qu'elle la lit).
 */

const LINK_HOURS = 1;
const CODE_MINUTES = 15;

export async function sendPasswordResetEmail(user: { id: string; email: string; name: string }): Promise<void> {
  const { code, token } = await issueCode(user.id, "reset", { codeMinutes: CODE_MINUTES, linkHours: LINK_HOURS });
  const link = `${await siteUrl()}/forgot-password?token=${token}`;
  await sendMail({
    to: user.email,
    ...passwordResetEmail({ name: user.name, code, link, codeMinutes: CODE_MINUTES, linkHours: LINK_HOURS }, await getLocale()),
  });
}

const setPassword = (passwordHash: string) => async (tx: Queryable, userId: string) => {
  await tx.query(
    "UPDATE users SET password_hash = $1, password_changed_at = now(), email_verified_at = coalesce(email_verified_at, now()) WHERE id = $2",
    [passwordHash, userId],
  );
};

export async function resetPasswordWithCode(email: string, code: string, passwordHash: string) {
  return (await checkCode(email, "reset", code, setPassword(passwordHash))).status;
}

export async function resetPasswordWithLink(token: string, passwordHash: string): Promise<boolean> {
  return consumeLinkToken(token, "reset", setPassword(passwordHash));
}

export const isResetLinkValid = (token: string) => isLinkTokenValid(token, "reset");
