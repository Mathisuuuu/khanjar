import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { getDb, type Queryable } from "@/lib/db";

/**
 * Codes à 6 chiffres et liens envoyés par e-mail, pour vérifier une adresse
 * (`verify`) ou réinitialiser un mot de passe (`reset`).
 * - La base ne garde que des empreintes sha256 (table email_tokens).
 * - Un nouvel envoi annule les précédents ; utiliser le code ou le lien annule les deux.
 * - Après 5 codes faux, le code est annulé : il faut en demander un autre.
 */

export type CodeKind = "verify" | "reset";

const MAX_CODE_ATTEMPTS = 5;

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
/** Le code est court : son empreinte inclut l'identifiant du compte (aucune collision entre comptes). */
const codeDigest = (kind: CodeKind, userId: string, code: string) =>
  digest(kind === "verify" ? `code:${userId}:${code}` : `${kind}:${userId}:${code}`);
const purposes = (kind: CodeKind) => [kind, `${kind}_code`] as const;

/** Adresse publique du site, pour construire les liens. */
export async function siteUrl(): Promise<string> {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  const list = await headers();
  const host = list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Crée un code et un jeton de lien neufs pour ce compte. */
export async function issueCode(
  userId: string,
  kind: CodeKind,
  validity: { codeMinutes: number; linkHours: number },
): Promise<{ code: string; token: string }> {
  const token = randomBytes(32).toString("base64url");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const [linkPurpose, codePurpose] = purposes(kind);
  const db = await getDb();
  await db.transaction(async (tx) => {
    await clearCodes(tx, userId, kind);
    await tx.query(
      `INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES
         ($1, $2, $3, now() + make_interval(hours => $4)),
         ($5, $2, $6, now() + make_interval(mins => $7))`,
      [digest(token), userId, linkPurpose, validity.linkHours, codeDigest(kind, userId, code), codePurpose, validity.codeMinutes],
    );
  });
  return { code, token };
}

export async function clearCodes(tx: Queryable, userId: string, kind: CodeKind) {
  await tx.query("DELETE FROM email_tokens WHERE user_id = $1 AND purpose = ANY($2)", [userId, [...purposes(kind)]]);
}

export type CodeCheck = { status: "ok"; userId: string } | { status: "wrong" } | { status: "expired" };

/**
 * Vérifie un code dans une transaction ; en cas de succès, `onSuccess` s'exécute
 * dans la même transaction et le code comme le lien sont annulés.
 */
export async function checkCode(
  email: string,
  kind: CodeKind,
  code: string,
  onSuccess: (tx: Queryable, userId: string) => Promise<void>,
): Promise<CodeCheck> {
  if (!/^\d{6}$/.test(code)) return { status: "wrong" };
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.query<{ token_hash: string; user_id: string; attempts: number }>(
      `SELECT t.token_hash, t.user_id, t.attempts FROM email_tokens t JOIN users u ON u.id = t.user_id
       WHERE u.email = $1 AND t.purpose = $2 AND t.expires_at > now()
       FOR UPDATE OF t`,
      [email.toLowerCase(), `${kind}_code`],
    );
    if (!row) return { status: "expired" } as const;
    const expected = Buffer.from(row.token_hash, "hex");
    const given = Buffer.from(codeDigest(kind, row.user_id, code), "hex");
    if (timingSafeEqual(expected, given)) {
      await clearCodes(tx, row.user_id, kind);
      await onSuccess(tx, row.user_id);
      return { status: "ok", userId: row.user_id } as const;
    }
    if (row.attempts + 1 >= MAX_CODE_ATTEMPTS) {
      await tx.query("DELETE FROM email_tokens WHERE token_hash = $1", [row.token_hash]);
      return { status: "expired" } as const;
    }
    await tx.query("UPDATE email_tokens SET attempts = attempts + 1 WHERE token_hash = $1", [row.token_hash]);
    return { status: "wrong" } as const;
  });
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

/** Utilise un lien : `onSuccess` s'exécute dans la même transaction. Renvoie `false` si le lien est invalide ou expiré. */
export async function consumeLinkToken(
  token: string,
  kind: CodeKind,
  onSuccess: (tx: Queryable, userId: string) => Promise<void>,
): Promise<boolean> {
  if (!TOKEN_PATTERN.test(token)) return false;
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.query<{ user_id: string }>(
      `DELETE FROM email_tokens WHERE token_hash = $1 AND purpose = $2 AND expires_at > now() RETURNING user_id`,
      [digest(token), kind],
    );
    if (!row) return false;
    await clearCodes(tx, row.user_id, kind);
    await onSuccess(tx, row.user_id);
    return true;
  });
}

/** Le lien est-il encore valable ? (sans le consommer, pour afficher la bonne page) */
export async function isLinkTokenValid(token: string, kind: CodeKind): Promise<boolean> {
  if (!TOKEN_PATTERN.test(token)) return false;
  const db = await getDb();
  const rows = await db.query("SELECT 1 FROM email_tokens WHERE token_hash = $1 AND purpose = $2 AND expires_at > now()", [
    digest(token),
    kind,
  ]);
  return rows.length > 0;
}
