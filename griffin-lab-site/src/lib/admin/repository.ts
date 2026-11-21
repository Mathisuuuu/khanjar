import "server-only";
import { getDb, iso, isUuid } from "@/lib/db";

/**
 * Données et actions de l'espace administrateur : comptes, bannissements,
 * suppression de contenu. Toujours appelé après une vérification `isAdmin`.
 */

export type AccountRow = {
  userKey: string;
  provider: string;
  pseudo: string;
  email: string | null;
  verified: boolean | null; // null : compte externe (Discord…), vérifié par le fournisseur
  createdAt: string;
  proposals: number;
  groups: number;
  posts: number;
  banned: boolean;
};

export type BannedRow = { userKey: string; pseudo: string | null; reason: string; bannedAt: string };

export type AdminStats = { accounts: number; proposals: number; pending: number; groups: number; posts: number; banned: number };

export async function getStats(): Promise<AdminStats> {
  const db = await getDb();
  const [row] = await db.query<Record<keyof AdminStats, number>>(
    `SELECT
       (SELECT count(*) FROM profiles)::int AS accounts,
       (SELECT count(*) FROM proposals)::int AS proposals,
       (SELECT count(*) FROM proposals WHERE status = 'pending')::int AS pending,
       (SELECT count(*) FROM research_groups)::int AS groups,
       (SELECT count(*) FROM research_posts)::int AS posts,
       (SELECT count(*) FROM banned_accounts)::int AS banned`,
  );
  return row;
}

/** Comptes ayant un pseudo (tous les comptes actifs), filtrés par pseudo ou e-mail. */
export async function listAccounts(search = ""): Promise<AccountRow[]> {
  const db = await getDb();
  const rows = await db.query<{
    user_key: string;
    pseudo: string;
    email: string | null;
    email_verified_at: Date | null;
    created_at: Date;
    proposals: number;
    groups: number;
    posts: number;
    banned: boolean;
  }>(
    `SELECT p.user_key, p.pseudo, u.email, u.email_verified_at, p.created_at,
       (SELECT count(*) FROM proposals x WHERE x.author_id = p.user_key)::int AS proposals,
       (SELECT count(*) FROM research_groups g WHERE g.owner_id = p.user_key)::int AS groups,
       (SELECT count(*) FROM research_posts r WHERE r.author_id = p.user_key)::int AS posts,
       EXISTS (SELECT 1 FROM banned_accounts b WHERE b.user_key = p.user_key) AS banned
     FROM profiles p
     LEFT JOIN users u ON p.user_key = 'credentials:' || u.id::text
     WHERE $1 = '' OR p.pseudo ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%'
     ORDER BY p.created_at DESC
     LIMIT 200`,
    [search.trim()],
  );
  return rows.map((row) => {
    const provider = row.user_key.split(":")[0];
    return {
      userKey: row.user_key,
      provider,
      pseudo: row.pseudo,
      email: row.email,
      verified: provider === "credentials" ? row.email_verified_at !== null : null,
      createdAt: iso(row.created_at),
      proposals: Number(row.proposals),
      groups: Number(row.groups),
      posts: Number(row.posts),
      banned: row.banned,
    };
  });
}

export async function listBanned(): Promise<BannedRow[]> {
  const db = await getDb();
  const rows = await db.query<{ user_key: string; pseudo: string | null; reason: string; banned_at: Date }>(
    "SELECT * FROM banned_accounts ORDER BY banned_at DESC",
  );
  return rows.map((r) => ({ userKey: r.user_key, pseudo: r.pseudo, reason: r.reason, bannedAt: iso(r.banned_at) }));
}

export async function isBanned(userKey: string): Promise<boolean> {
  const db = await getDb();
  return (await db.query("SELECT 1 FROM banned_accounts WHERE user_key = $1", [userKey])).length > 0;
}

/** Bloque l'accès au site (connexion refusée, session ignorée). */
export async function banAccount(userKey: string, reason: string, bannedBy: string): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO banned_accounts (user_key, pseudo, reason, banned_by)
     VALUES ($1, (SELECT pseudo FROM profiles WHERE user_key = $1), $2, $3)
     ON CONFLICT (user_key) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_at = now()`,
    [userKey, reason, bannedBy],
  );
}

export async function unbanAccount(userKey: string): Promise<void> {
  const db = await getDb();
  await db.query("DELETE FROM banned_accounts WHERE user_key = $1", [userKey]);
}

/**
 * Supprime un compte et tout ce qu'il a publié : propositions, groupes dont il
 * est propriétaire (avec leurs publications et fichiers), publications dans
 * les autres groupes, invitations, pseudo et, pour un compte e-mail, le compte lui-même.
 */
export async function deleteAccount(userKey: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [provider, id] = [userKey.split(":")[0], userKey.slice(userKey.indexOf(":") + 1)];
    const email =
      provider === "credentials" && isUuid(id)
        ? (await tx.query<{ email: string }>("SELECT email FROM users WHERE id = $1", [id]))[0]?.email
        : undefined;

    await tx.query("DELETE FROM proposals WHERE author_id = $1", [userKey]);
    await tx.query("DELETE FROM research_groups WHERE owner_id = $1", [userKey]);
    await tx.query("DELETE FROM research_posts WHERE author_id = $1", [userKey]);
    if (email) await tx.query("DELETE FROM research_members WHERE email = $1", [email]);
    await tx.query("DELETE FROM book_strategies WHERE user_key = $1", [userKey]);
    await tx.query("DELETE FROM book_members WHERE user_key = $1", [userKey]);
    await tx.query("DELETE FROM post_likes WHERE user_key = $1", [userKey]);
    await tx.query("DELETE FROM profiles WHERE user_key = $1", [userKey]);
    if (provider === "credentials" && isUuid(id)) await tx.query("DELETE FROM users WHERE id = $1", [id]);
  });
}

export type GroupRow = {
  id: string;
  name: string;
  kind: string;
  visibility: string;
  ownerName: string;
  posts: number;
  updatedAt: string;
};

/** Tous les groupes, privés compris. */
export async function listAllGroups(): Promise<GroupRow[]> {
  const db = await getDb();
  const rows = await db.query<{
    id: string;
    name: string;
    kind: string;
    visibility: string;
    owner_name: string;
    posts: number;
    updated_at: Date;
  }>(
    `SELECT g.id, g.name, g.kind, g.visibility, g.owner_name, g.updated_at,
       (SELECT count(*) FROM research_posts p WHERE p.group_id = g.id)::int AS posts
     FROM research_groups g ORDER BY g.updated_at DESC LIMIT 200`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    visibility: r.visibility,
    ownerName: r.owner_name,
    posts: Number(r.posts),
    updatedAt: iso(r.updated_at),
  }));
}

export async function deleteProposal(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const db = await getDb();
  await db.query("DELETE FROM proposals WHERE id = $1", [id]);
}
