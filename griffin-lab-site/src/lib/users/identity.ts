import "server-only";
import { getDb } from "@/lib/db";
import type { Viewer } from "@/lib/viewer";

/**
 * Qui peut voir le nom et le profil d'une personne (réglage sur /compte, voir
 * visibility-choices.ts). La personne elle-même, les administrateurs et
 * l'équipe voient toujours le vrai nom (l'équipe gère les membres des books).
 */
import type { ProfileVisibility } from "./visibility-choices";

export { PROFILE_VISIBILITIES, visibilityChoices, type ProfileVisibility } from "./visibility-choices";

export const ANONYMOUS_NAME = "Anonyme";

/** Ce qu'une personne donnée peut afficher d'un compte. */
export type PublicIdentity = {
  /** Pseudo, ou « Anonyme ». */
  name: string;
  /** Lien vers le profil (/membres/…), `null` si le profil est masqué pour cette personne. */
  href: string | null;
  /** Le compte est masqué pour cette personne. */
  anonymous: boolean;
  /** Le compte se masque, mais cette personne le voit quand même (soi-même, admin, équipe). */
  maskedForOthers: boolean;
};

type ProfileRow = { user_key: string; pseudo: string; visibility: ProfileVisibility };

export const profileHref = (pseudo: string) => `/membres/${encodeURIComponent(pseudo)}`;

/** Clés des comptes (parmi `keys`) qui partagent au moins un book avec `viewerKey`. */
async function bookPeers(viewerKey: string, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const db = await getDb();
  const rows = await db.query<{ user_key: string }>(
    `SELECT DISTINCT other.user_key FROM book_members mine
     JOIN book_members other ON other.book_id = mine.book_id
     WHERE mine.user_key = $1 AND other.user_key = ANY($2)`,
    [viewerKey, keys],
  );
  return new Set(rows.map((row) => row.user_key));
}

/**
 * Résout comment `viewer` voit chacun des comptes `keys`. Un compte sans
 * profil (supprimé) garde `fallbackNames[key]` sans lien.
 */
export async function resolveIdentities(
  keys: string[],
  viewer: Viewer | null,
  fallbackNames: Record<string, string> = {},
): Promise<Map<string, PublicIdentity>> {
  const unique = [...new Set(keys)];
  const result = new Map<string, PublicIdentity>();
  if (unique.length === 0) return result;

  const db = await getDb();
  const profiles = await db.query<ProfileRow>(
    `SELECT p.user_key, p.pseudo, p.visibility FROM profiles p
     WHERE p.user_key = ANY($1) AND NOT EXISTS (SELECT 1 FROM banned_accounts b WHERE b.user_key = p.user_key)`,
    [unique],
  );
  const byKey = new Map(profiles.map((row) => [row.user_key, row]));
  const privileged = !!viewer && (viewer.isAdmin || viewer.isTeam);
  const needsPeers = !!viewer && !privileged && profiles.some((row) => row.visibility === "books");
  const peers = needsPeers ? await bookPeers(viewer.id, profiles.filter((r) => r.visibility === "books").map((r) => r.user_key)) : new Set<string>();

  for (const key of unique) {
    const profile = byKey.get(key);
    if (!profile) {
      result.set(key, { name: fallbackNames[key] ?? ANONYMOUS_NAME, href: null, anonymous: !fallbackNames[key], maskedForOthers: false });
      continue;
    }
    const self = viewer?.id === key;
    const masked = profile.visibility !== "public";
    const visible =
      self ||
      privileged ||
      profile.visibility === "public" ||
      (profile.visibility === "books" && peers.has(key));
    result.set(
      key,
      visible
        ? { name: profile.pseudo, href: profileHref(profile.pseudo), anonymous: false, maskedForOthers: masked }
        : { name: ANONYMOUS_NAME, href: null, anonymous: true, maskedForOthers: false },
    );
  }
  return result;
}

export async function getVisibility(userKey: string): Promise<ProfileVisibility> {
  const db = await getDb();
  const [row] = await db.query<{ visibility: ProfileVisibility }>("SELECT visibility FROM profiles WHERE user_key = $1", [userKey]);
  return row?.visibility ?? "public";
}

export async function setVisibility(userKey: string, visibility: ProfileVisibility): Promise<void> {
  const db = await getDb();
  await db.query("UPDATE profiles SET visibility = $2, updated_at = now() WHERE user_key = $1", [userKey, visibility]);
}

/** Profil trouvé par son pseudo (sans tenir compte des majuscules), hors comptes bannis. */
export async function findProfileByPseudo(pseudo: string): Promise<{ userKey: string; pseudo: string; createdAt: string } | null> {
  const db = await getDb();
  const [row] = await db.query<{ user_key: string; pseudo: string; created_at: Date }>(
    `SELECT p.user_key, p.pseudo, p.created_at FROM profiles p
     WHERE lower(p.pseudo) = lower($1) AND NOT EXISTS (SELECT 1 FROM banned_accounts b WHERE b.user_key = p.user_key)`,
    [pseudo],
  );
  return row ? { userKey: row.user_key, pseudo: row.pseudo, createdAt: new Date(row.created_at).toISOString() } : null;
}
