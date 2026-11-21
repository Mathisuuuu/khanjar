import "server-only";
import { getDb } from "@/lib/db";
import { listBooksOf } from "@/lib/books/repository";
import { postsByAuthor } from "@/lib/research/likes";
import { getProposalRepository } from "@/lib/proposals/repository";
import { getResearchRepository } from "@/lib/research/repository";
import { getVisibility } from "@/lib/users/identity";
import { getUserRepository } from "@/lib/users/repository";
import type { Viewer } from "@/lib/auth/viewer";

/** Tout ce que la page /account affiche sur la personne connectée. */
export async function getAccountOverview(viewer: Viewer) {
  const [provider, rawId] = [viewer.id.split(":")[0], viewer.id.slice(viewer.id.indexOf(":") + 1)];
  const db = await getDb();
  const [user, visibility, proposals, posts, books, groups, profileRows, likesGiven] = await Promise.all([
    provider === "credentials" ? getUserRepository().findById(rawId) : Promise.resolve(null),
    getVisibility(viewer.id),
    getProposalRepository().listByAuthor(viewer.id),
    postsByAuthor(viewer.id),
    listBooksOf(viewer.id),
    getResearchRepository().listGroups(),
    db.query<{ created_at: Date }>("SELECT created_at FROM profiles WHERE user_key = $1", [viewer.id]),
    db.query<{ n: number }>("SELECT count(*)::int AS n FROM post_likes WHERE user_key = $1", [viewer.id]),
  ]);

  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const contributedGroups = [...new Set(posts.map((p) => p.groupId))]
    .map((id) => groupsById.get(id))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map((g) => ({ id: g.id, name: g.name, posts: posts.filter((p) => p.groupId === g.id).length }));
  const ownedGroups = groups.filter((g) => g.ownerId === viewer.id).map((g) => ({ id: g.id, name: g.name }));

  const count = (status: string) => proposals.filter((p) => p.status === status).length;

  return {
    provider,
    email: user?.email ?? viewer.email,
    emailVerifiedAt: user?.emailVerifiedAt ?? null,
    hasPassword: !!user,
    memberSince: (user?.createdAt ?? profileRows[0]?.created_at ?? null) as string | Date | null,
    visibility,
    proposals,
    proposalCounts: {
      total: proposals.length,
      validated: count("validated"),
      pending: count("pending") + count("testing"),
      rejected: count("rejected"),
    },
    posts,
    likesReceived: posts.reduce((sum, p) => sum + p.likes, 0),
    likesGiven: Number(likesGiven[0]?.n ?? 0),
    books: books.map((b) => ({ id: b.id, name: b.name, color: b.color })),
    contributedGroups,
    ownedGroups,
  };
}
