import "server-only";
import { getDb, isUuid } from "@/lib/db";

/** Likes des publications de recherche : un like par compte et par publication. */

export type LikeState = { count: number; liked: boolean };

/** Nombre de likes de chaque publication, et si `viewerKey` l'a aimée. */
export async function likesFor(postIds: string[], viewerKey: string | null): Promise<Map<string, LikeState>> {
  const result = new Map<string, LikeState>(postIds.map((id) => [id, { count: 0, liked: false }]));
  if (postIds.length === 0) return result;
  const db = await getDb();
  const rows = await db.query<{ post_id: string; n: number; mine: boolean }>(
    `SELECT post_id, count(*)::int AS n, bool_or(user_key = $2) AS mine
     FROM post_likes WHERE post_id = ANY($1) GROUP BY post_id`,
    [postIds, viewerKey ?? ""],
  );
  for (const row of rows) result.set(row.post_id, { count: Number(row.n), liked: !!row.mine });
  return result;
}

/** Ajoute ou retire le like de `userKey`, puis renvoie l'état à jour. */
export async function toggleLike(postId: string, userKey: string): Promise<LikeState> {
  if (!isUuid(postId)) return { count: 0, liked: false };
  const db = await getDb();
  return db.transaction(async (tx) => {
    const removed = await tx.query("DELETE FROM post_likes WHERE post_id = $1 AND user_key = $2 RETURNING 1", [postId, userKey]);
    if (removed.length === 0) {
      await tx.query("INSERT INTO post_likes (post_id, user_key) VALUES ($1, $2) ON CONFLICT DO NOTHING", [postId, userKey]);
    }
    const [row] = await tx.query<{ n: number }>("SELECT count(*)::int AS n FROM post_likes WHERE post_id = $1", [postId]);
    return { count: Number(row?.n ?? 0), liked: removed.length === 0 };
  });
}

/** Publications d'un compte, avec leurs likes (pour son profil). */
export async function postsByAuthor(
  userKey: string,
): Promise<{ id: string; title: string; groupId: string; createdAt: string; likes: number }[]> {
  const db = await getDb();
  const rows = await db.query<{ id: string; title: string; group_id: string; created_at: Date; likes: number }>(
    `SELECT p.id, p.title, p.group_id, p.created_at, count(l.user_key)::int AS likes
     FROM research_posts p LEFT JOIN post_likes l ON l.post_id = p.id
     WHERE p.author_id = $1 GROUP BY p.id ORDER BY p.created_at DESC`,
    [userKey],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    groupId: row.group_id,
    createdAt: new Date(row.created_at).toISOString(),
    likes: Number(row.likes),
  }));
}
