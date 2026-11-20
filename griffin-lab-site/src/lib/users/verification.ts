import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { escapeHtml, sendMail } from "@/lib/mail";

/**
 * Vérification de l'adresse e-mail des comptes e-mail + mot de passe.
 * Le lien envoyé contient un jeton aléatoire ; la base n'en garde que
 * l'empreinte sha256, valable 24 heures et utilisable une seule fois.
 */

const VALIDITY_HOURS = 24;

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/** Adresse publique du site, pour construire le lien. */
async function siteUrl(): Promise<string> {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  const list = await headers();
  const host = list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Crée un nouveau jeton (les anciens sont annulés) et envoie l'e-mail. */
export async function sendVerificationEmail(user: { id: string; email: string; name: string }): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.query("DELETE FROM email_tokens WHERE user_id = $1 AND purpose = 'verify'", [user.id]);
    await tx.query(
      `INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at)
       VALUES ($1, $2, 'verify', now() + make_interval(hours => $3))`,
      [digest(token), user.id, VALIDITY_HOURS],
    );
  });

  const link = `${await siteUrl()}/verification?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Confirme ton adresse e-mail · Griffin Lab",
    text: [
      `Bonjour ${user.name},`,
      "",
      "Pour activer ton compte Griffin Lab, confirme ton adresse e-mail en ouvrant ce lien :",
      link,
      "",
      `Le lien est valable ${VALIDITY_HOURS} heures. Si tu n'as pas créé de compte, ignore cet e-mail.`,
    ].join("\n"),
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#18181b">
  <p>Bonjour ${escapeHtml(user.name)},</p>
  <p>Pour activer ton compte Griffin Lab, confirme ton adresse e-mail :</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#16a34a;color:#fff;text-decoration:none;font-weight:600">Confirmer mon adresse</a></p>
  <p style="color:#52525b;font-size:13px">Le lien est valable ${VALIDITY_HOURS} heures. Si tu n'as pas créé de compte, ignore cet e-mail.</p>
</div>`,
  });
}

/** Valide le jeton : marque l'adresse comme vérifiée. Renvoie `false` si le lien est invalide ou expiré. */
export async function confirmEmailToken(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return false;
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.query<{ user_id: string }>(
      `DELETE FROM email_tokens WHERE token_hash = $1 AND purpose = 'verify' AND expires_at > now()
       RETURNING user_id`,
      [digest(token)],
    );
    if (!row) return false;
    await tx.query("UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1", [
      row.user_id,
    ]);
    return true;
  });
}
