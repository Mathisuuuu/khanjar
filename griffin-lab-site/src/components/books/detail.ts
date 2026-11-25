import "server-only";
import { getAvatars } from "@/lib/discord/links";
import type { Viewer } from "@/lib/auth/viewer";
import { contentAccess, contributionsOf, listBookMembers } from "@/lib/books/repository";
import { listStrategies } from "@/lib/books/strategies";
import { getProposalRepository } from "@/lib/proposals/repository";
import { canRead } from "@/lib/research/access";
import { getResearchRepository } from "@/lib/research/repository";
import { resolveIdentities, type PublicIdentity } from "@/lib/users/identity";
import type { BookContents, BookStrategyEntry, CanvasGroup, CanvasMember } from "./types";

export type BookDetail = {
  keys: string[];
  identities: Map<string, PublicIdentity>;
  members: CanvasMember[];
  groups: CanvasGroup[];
  links: { member: string; group: string }[];
  contents: BookContents;
};

/**
 * Membres (canevas), recherches liées et contenu d'un book, filtrés pour `viewer`
 * (anonymat, droits de lecture, accès au contenu). Sert à /books et à /dashboards.
 */
export async function loadBookDetail(book: { id: string }, viewer: Viewer | null): Promise<BookDetail> {
  const keys = await listBookMembers(book.id);
  const [identities, contributions, groups, avatars] = await Promise.all([
    resolveIdentities(keys, viewer),
    contributionsOf(keys),
    getResearchRepository().listGroups(),
    getAvatars(keys),
  ]);

  const localId = new Map(keys.map((key, index) => [key, `m${index}`]));
  const members: CanvasMember[] = keys.map((key) => {
    const identity = identities.get(key)!;
    return {
      id: localId.get(key)!,
      name: identity.name,
      href: identity.href,
      anonymous: identity.anonymous,
      masked: identity.maskedForOthers,
      self: viewer?.id === key,
      // un membre anonyme pour cette personne n'est pas reconnaissable par sa photo
      avatar: identity.anonymous ? null : (avatars.get(key) ?? null),
    };
  });

  // seuls les groupes que la personne a le droit de lire apparaissent ;
  // un membre anonyme pour elle n'est relié à rien (on ne révèle pas ce qu'il a publié)
  const readable = new Map(groups.filter((g) => canRead(g, viewer)).map((g) => [g.id, g]));
  const links = contributions
    .filter((c) => readable.has(c.groupId) && !identities.get(c.userKey)?.anonymous)
    .map((c) => ({ member: localId.get(c.userKey)!, group: c.groupId }));
  const usedGroups: CanvasGroup[] = [...new Set(links.map((l) => l.group))].map((id) => ({
    id,
    name: readable.get(id)!.name,
    href: `/research/${id}`,
  }));

  // contenu (stratégies, rapports, code, fichiers), filtré ici côté serveur :
  // « all » = administrateur ou membre autorisé ; « own » = sa seule stratégie
  let contents: BookContents = { access: false };
  const access = await contentAccess(book.id, viewer);
  if (access !== "none") {
    const visibleKeys = access === "all" ? keys : keys.filter((key) => key === viewer?.id);
    const [strategies, proposals] = await Promise.all([
      listStrategies(book.id),
      getProposalRepository().listByAuthors(visibleKeys),
    ]);
    const entries: BookStrategyEntry[] = visibleKeys.map((key) => {
      const identity = identities.get(key)!;
      const row = strategies.find((s) => s.userKey === key && visibleKeys.includes(s.userKey));
      const own = proposals.filter((p) => p.authorId === key);
      // fiche liée à une proposition ; sans fiche, sa dernière stratégie validée
      const linked = row
        ? own.find((p) => p.id === row.proposalId)
        : own.find((p) => p.status === "validated");
      const editable = !!viewer?.isAdmin || viewer?.id === key;
      return {
        memberId: localId.get(key)!,
        author: identity.name,
        authorHref: identity.href,
        self: viewer?.id === key,
        deposited: !!row || !!linked,
        title: row?.title || linked?.title || "",
        market: row?.market || linked?.market || "",
        summary: row?.summary || linked?.description || "",
        report: row?.report ?? "",
        proposalId: row ? row.proposalId : (linked?.id ?? null),
        type: linked?.type,
        status: linked?.status,
        score: linked?.score,
        reason: linked?.reason,
        code: linked?.code,
        paper: linked?.paper,
        files: (row?.files ?? []).map(({ id, name, size, kind }) => ({ id, name, size, kind })),
        updatedAt: row?.updatedAt,
        editable,
        proposals: editable ? own.map((p) => ({ id: p.id, title: p.title, status: p.status })) : [],
      };
    });
    contents = { access: true, restricted: access === "own", strategies: entries };
  }

  return { keys, identities, members, groups: usedGroups, links, contents };
}
