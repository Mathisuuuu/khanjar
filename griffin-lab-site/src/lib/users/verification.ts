import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { getDb, type Queryable } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { verificationEmail } from "./verification-email";

/**
 * Vérification de l'adresse e-mail des comptes e-mail + mot de passe.
 * L'e-mail contient un code à 6 chiffres (30 minutes, 5 essais) et un lien
 * (24 heures). La base ne garde que des empreintes sha256 ; utiliser l'un
 * annule l'autre.
 */

const VALIDITY_HOURS = 24;
const CODE_MINUTES = 30;
const MAX_CODE_ATTEMPTS = 5;

const digest = (token: string) => createHash("sha256").update(token).digest("hex");
/** Le code est court : son empreinte inclut l'identifiant du compte (aucune collision entre comptes). */
const codeDigest = (userId: string, code: string) => digest(`code:${userId}:${code}`);

/** Adresse publique du site, pour construire le lien. */
async function siteUrl(): Promise<string> {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  const list = await headers();
  const host = list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Crée un nouveau code et un nouveau lien (les anciens sont annulés) et envoie l'e-mail. */
export async function sendVerificationEmail(user: { id: string; email: string; name: string }): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.query("DELETE FROM email_tokens WHERE user_id = $1 AND purpose IN ('verify', 'verify_code')", [user.id]);
    await tx.query(
      `INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES
         ($1, $2, 'verify', now() + make_interval(hours => $3)),
         ($4, $2, 'verify_code', now() + make_interval(mins => $5))`,
      [digest(token), user.id, VALIDITY_HOURS, codeDigest(user.id, code), CODE_MINUTES],
    );
  });

  const link = `${await siteUrl()}/verification?token=${token}`;
  await sendMail({
    to: user.email,
    ...verificationEmail({ name: user.name, code, link, codeMinutes: CODE_MINUTES, linkHours: VALIDITY_HOURS }),
  });
}

async function markVerified(tx: Queryable, userId: string) {
  await tx.query("DELETE FROM email_tokens WHERE user_id = $1 AND purpose IN ('verify', 'verify_code')", [userId]);
  await tx.query("UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1", [userId]);
}

export type CodeResult = "ok" | "wrong" | "expired";

/**
 * Vérifie le code saisi. Après 5 erreurs le code est annulé (« expired ») :
 * il faut en demander un nouveau.
 */
export async function confirmEmailCode(email: string, code: string): Promise<CodeResult> {
  if (!/^\d{6}$/.test(code)) return "wrong";
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.query<{ token_hash: string; user_id: string; attempts: number }>(
      `SELECT t.token_hash, t.user_id, t.attempts FROM email_tokens t JOIN users u ON u.id = t.user_id
       WHERE u.email = $1 AND t.purpose = 'verify_code' AND t.expires_at > now()
       FOR UPDATE OF t`,
      [email.toLowerCase()],
    );
    if (!row) return "expired";
    const expected = Buffer.from(row.token_hash, "hex");
    const given = Buffer.from(codeDigest(row.user_id, code), "hex");
    if (timingSafeEqual(expected, given)) {
      await markVerified(tx, row.user_id);
      return "ok";
    }
    if (row.attempts + 1 >= MAX_CODE_ATTEMPTS) {
      await tx.query("DELETE FROM email_tokens WHERE token_hash = $1", [row.token_hash]);
      return "expired";
    }
    await tx.query("UPDATE email_tokens SET attempts = attempts + 1 WHERE token_hash = $1", [row.token_hash]);
    return "wrong";
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
    await markVerified(tx, row.user_id);
    return true;
  });
}
