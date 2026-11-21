import "server-only";
import {
  canAccessBook,
  contentAccess,
  contributionsOf,
  getBook,
  listBookMembers,
  listBooks,
  listBooksOf,
  strategyViewers,
} from "@/lib/books/repository";
import { listStrategies } from "@/lib/books/strategies";
import { getProposalRepository } from "@/lib/proposals/repository";
import { liveStats } from "@/lib/books/simulation";
import { canRead } from "@/lib/research/access";
import { getResearchRepository } from "@/lib/research/repository";
import { resolveIdentities } from "@/lib/users/identity";
import { getViewer } from "@/lib/viewer";
import { BookWorkspace } from "./BookWorkspace";
import type {
  BookContents,
  BookListItem,
  BookStrategyEntry,
  CanvasGroup,
  CanvasMember,
  EditableBook,
  ManagedMember,
  SelectedBook,
} from "./types";

/** Charge les books, le book choisi (si la personne y a accès) et rend l'espace de travail. */
export async function BooksView({ selectedId }: { selectedId?: string }) {
  const viewer = await getViewer();
  const team = !!viewer && (viewer.isTeam || viewer.isAdmin);
  const [books, mine] = await Promise.all([listBooks(), viewer ? listBooksOf(viewer.id) : Promise.resolve([])]);
  const mineIds = new Set(mine.map((book) => book.id));
  // rendement en direct (la simulation avance d'une heure à chaque heure écoulée)
  const live = await liveStats(books);
  const liveStatsOf = (book: (typeof books)[number]) =>
    book.stats
      ? {
          ...book.stats,
          monthReturn: live.get(book.id)?.monthReturn ?? book.stats.monthReturn,
          weekReturn: live.get(book.id)?.weekReturn,
        }
      : null;

  const list: BookListItem[] = books.map((book) => ({
    id: book.id,
    name: book.name,
    color: book.color,
    locked: !viewer,
    member: mineIds.has(book.id),
    monthReturn: liveStatsOf(book)?.monthReturn ?? null,
  }));

  let selected: SelectedBook | null = null;
  let managed: ManagedMember[] = [];
  let editable: EditableBook | null = null;

  const book = selectedId ? await getBook(selectedId) : null;
  if (book) {
    if (!(await canAccessBook(book.id, viewer))) {
      selected = { id: book.id, name: book.name, color: book.color, access: false };
    } else {
      const keys = await listBookMembers(book.id);
      const [identities, contributions, groups] = await Promise.all([
        resolveIdentities(keys, viewer),
        contributionsOf(keys),
        getResearchRepository().listGroups(),
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
        href: `/recherches/${id}`,
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

      selected = {
        id: book.id,
        name: book.name,
        color: book.color,
        description: book.description,
        stats: liveStatsOf(books.find((b) => b.id === book.id) ?? book),
        access: true,
        members,
        groups: usedGroups,
        links,
        contents,
      };

      if (team) {
        const viewers = viewer?.isAdmin ? await strategyViewers(book.id) : new Set<string>();
        managed = keys.map((key) => ({
          userKey: key,
          name: identities.get(key)!.name,
          masked: identities.get(key)!.maskedForOthers,
          canView: viewers.has(key),
        }));
        const num = (value: number | undefined) => (value === undefined ? "" : String(value).replace(".", ","));
        editable = {
          name: book.name,
          description: book.description,
          color: book.color,
          strategies: num(book.stats?.strategies),
          sharpe: num(book.stats?.sharpe),
          maxDrawdown: num(book.stats?.maxDrawdown),
          monthReturn: num(book.stats?.monthReturn),
        };
      }
    }
  }

  return (
    <BookWorkspace
      books={list}
      selected={selected}
      team={team}
      admin={!!viewer?.isAdmin}
      signedIn={!!viewer}
      managed={managed}
      editable={editable}
    />
  );
}
