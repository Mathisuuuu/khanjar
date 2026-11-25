import "server-only";
import { canAccessBook, getBook, listBooks, listBooksOf, strategyViewers } from "@/lib/books/repository";
import { liveStats } from "@/lib/books/simulation";
import { getLocale } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth/viewer";
import { BookWorkspace } from "./BookWorkspace";
import { loadBookDetail } from "./detail";
import type { BookListItem, EditableBook, ManagedMember, SelectedBook } from "./types";

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
          strategies: book.stats.strategies,
          sharpe: book.stats.sharpe,
          maxDrawdown: book.stats.maxDrawdown,
          dayReturn: live.get(book.id)?.dayReturn ?? 0,
          allTime: live.get(book.id)?.allTime ?? book.stats.allTime,
          weekReturn: live.get(book.id)?.weekReturn,
        }
      : null;

  const list: BookListItem[] = books.map((book) => ({
    id: book.id,
    name: book.name,
    color: book.color,
    locked: !viewer,
    member: mineIds.has(book.id),
    dayReturn: liveStatsOf(book)?.dayReturn ?? null,
  }));

  let selected: SelectedBook | null = null;
  let managed: ManagedMember[] = [];
  let editable: EditableBook | null = null;

  const book = selectedId ? await getBook(selectedId) : null;
  if (book) {
    if (!(await canAccessBook(book.id, viewer))) {
      selected = { id: book.id, name: book.name, color: book.color, access: false };
    } else {
      const { keys, identities, members, groups: usedGroups, links, contents } = await loadBookDetail(book, viewer);

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
        const decimal = (await getLocale()) === "en" ? "." : ",";
        const num = (value: number | null | undefined) => (value === undefined || value === null ? "" : String(value).replace(".", decimal));
        editable = {
          name: book.name,
          description: book.description,
          color: book.color,
          strategies: num(book.stats?.strategies),
          sharpe: num(book.stats?.sharpe),
          maxDrawdown: num(book.stats?.maxDrawdown),
          dailyReturn: num(book.stats?.dailyReturn),
          allTime: num(book.stats?.allTime),
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
