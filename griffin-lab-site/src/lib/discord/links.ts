import "server-only";
import { after } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Photo de profil Discord des membres. Un compte Discord y figure dès qu'on se
 * connecte avec Discord ; un compte e-mail ou Google peut y lier son Discord
 * depuis /account. On ne garde que l'identifiant Discord et l'empreinte de
 * l'image : l'image elle-même est servie par Discord (cdn.discordapp.com).
 */

const DISCORD_ID = /^\d{17,20}$/;
const AVATAR_HASH = /^(a_)?[0-9a-f]{32}$/;
/** Au-delà, l'empreinte est relue chez Discord (la photo a pu changer). */
const REFRESH_AFTER_MS = 24 * 3600_000;

export type DiscordLink = { discordId: string; avatarUrl: string | null };

/** Adresse de la photo, ou `null` si la personne n'en a pas (ou une valeur inattendue). */
export function avatarUrl(discordId: string, avatar: string | null): string | null {
  if (!DISCORD_ID.test(discordId) || !avatar || !AVATAR_HASH.test(avatar)) return null;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`;
}

export async function saveDiscordLink(userKey: string, discordId: string, avatar: string | null | undefined) {
  if (!DISCORD_ID.test(discordId)) return;
  const hash = avatar && AVATAR_HASH.test(avatar) ? avatar : null;
  const db = await getDb();
  await db.query(
    `INSERT INTO discord_links (user_key, discord_id, avatar) VALUES ($1, $2, $3)
     ON CONFLICT (user_key) DO UPDATE SET discord_id = EXCLUDED.discord_id, avatar = EXCLUDED.avatar, updated_at = now()`,
    [userKey, discordId, hash],
  );
}

export async function removeDiscordLink(userKey: string) {
  const db = await getDb();
  await db.query("DELETE FROM discord_links WHERE user_key = $1", [userKey]);
}

export async function getDiscordLink(userKey: string): Promise<DiscordLink | null> {
  const db = await getDb();
  const [row] = await db.query<{ discord_id: string; avatar: string | null }>(
    "SELECT discord_id, avatar FROM discord_links WHERE user_key = $1",
    [userKey],
  );
  return row ? { discordId: row.discord_id, avatarUrl: avatarUrl(row.discord_id, row.avatar) } : null;
}

/** Photos des comptes `keys` (ceux qui en ont une). Les empreintes anciennes sont relues en arrière-plan. */
export async function getAvatars(keys: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (keys.length === 0) return result;
  const db = await getDb();
  const rows = await db.query<{ user_key: string; discord_id: string; avatar: string | null; updated_at: Date }>(
    "SELECT user_key, discord_id, avatar, updated_at FROM discord_links WHERE user_key = ANY($1)",
    [keys],
  );
  const stale: typeof rows = [];
  for (const row of rows) {
    const url = avatarUrl(row.discord_id, row.avatar);
    if (url) result.set(row.user_key, url);
    if (Date.now() - new Date(row.updated_at).getTime() > REFRESH_AFTER_MS) stale.push(row);
  }
  if (stale.length && process.env.DISCORD_BOT_TOKEN) {
    try {
      after(() => refresh(stale.slice(0, 20)));
    } catch {
      // hors d'une requête : pas de rafraîchissement
    }
  }
  return result;
}

/** Relit l'empreinte de la photo avec le bot (l'API publique des profils Discord). */
async function refresh(rows: { user_key: string; discord_id: string }[]) {
  const db = await getDb();
  for (const row of rows) {
    try {
      const res = await fetch(`https://discord.com/api/v10/users/${row.discord_id}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 429) break;
      if (!res.ok) {
        await db.query("UPDATE discord_links SET updated_at = now() WHERE user_key = $1", [row.user_key]);
        continue;
      }
      const user = (await res.json()) as { avatar?: string | null };
      const hash = user.avatar && AVATAR_HASH.test(user.avatar) ? user.avatar : null;
      await db.query("UPDATE discord_links SET avatar = $2, updated_at = now() WHERE user_key = $1", [row.user_key, hash]);
    } catch {
      // Discord injoignable : on réessaiera plus tard
    }
  }
}

const SESSION_IMAGE = /^https:\/\/cdn\.discordapp\.com\/avatars\/(\d{17,20})\/((?:a_)?[0-9a-f]{32})\.(?:png|gif|webp|jpg)(?:\?.*)?$/;
/** Comptes déjà vérifiés par ce processus (une seule écriture par compte et par démarrage). */
const synced = new Set<string>();

/**
 * Session Discord ouverte avant l'arrivée des photos : la photo est déjà dans la
 * session (image du profil), on l'enregistre sans attendre la prochaine connexion.
 * N'écrase jamais une liaison existante.
 */
export async function syncDiscordLinkFromSession(userKey: string, discordId: string, image: string | null | undefined) {
  if (synced.has(userKey)) return;
  synced.add(userKey);
  const match = image ? SESSION_IMAGE.exec(image) : null;
  if (!DISCORD_ID.test(discordId) || (match && match[1] !== discordId)) return;
  const db = await getDb();
  await db.query(
    "INSERT INTO discord_links (user_key, discord_id, avatar) VALUES ($1, $2, $3) ON CONFLICT (user_key) DO NOTHING",
    [userKey, discordId, match ? match[2] : null],
  );
}
