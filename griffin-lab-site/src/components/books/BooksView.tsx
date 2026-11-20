import "server-only";
import { canAccessBook, contributionsOf, getBook, listBookMembers, listBooks, listBooksOf } from "@/lib/books/repository";
import { liveStats } from "@/lib/books/simulation";
import { canRead } from "@/lib/research/access";
import { getResearchRepository } from "@/lib/research/repository";
import { resolveIdentities } from "@/lib/users/identity";
import { getViewer } from "@/lib/viewer";
import { BookWorkspace } from "./BookWorkspace";
import type { BookListItem, CanvasGroup, CanvasMember, EditableBook, ManagedMember, SelectedBook } from "./types";

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
      };

      if (team) {
        managed = keys.map((key) => ({ userKey: key, name: identities.get(key)!.name, masked: identities.get(key)!.maskedForOthers }));
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
      signedIn={!!viewer}
      managed={managed}
      editable={editable}
    />
  );
}
