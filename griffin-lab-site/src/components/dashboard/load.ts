import "server-only";
import { getViewer, type Viewer } from "@/lib/auth/viewer";
import { loadBookDetail } from "@/components/books/detail";
import { listBooks, listBooksOf, type Book } from "@/lib/books/repository";
import { dailyReturns, liveStats } from "@/lib/books/simulation";
import { EXAMPLE_ID, exampleBook } from "@/lib/dashboard/example";
import { makeT } from "@/lib/i18n/core";
import { getLocale } from "@/lib/i18n/server";
import type { DashboardBook, DashboardTab } from "./types";

/**
 * Données de /dashboards : les books dont la personne fait partie, puis le
 * book d'exemple. Sans book, ou sans compte, on montre l'exemple. L'équipe peut
 * ouvrir n'importe quel book par son adresse (?book=…) sans qu'il soit listé.
 */
export async function loadDashboard(requested?: string) {
  const [viewer, locale] = await Promise.all([getViewer(), getLocale()]);
  const t = makeT(locale);
  const team = !!viewer && (viewer.isTeam || viewer.isAdmin);
  const books = viewer ? await listBooksOf(viewer.id) : [];
  const example = exampleBook(locale);

  const own = books.find((b) => b.id === requested);
  const other = !own && team && requested && requested !== EXAMPLE_ID ? (await listBooks()).find((b) => b.id === requested) : undefined;
  const chosen = requested === EXAMPLE_ID ? null : (own ?? other ?? books[0] ?? null);
  const tabs: DashboardTab[] = [
    ...[...books, ...(other ? [other] : [])].map((b) => ({ id: b.id, name: b.name, color: b.color })),
    { id: EXAMPLE_ID, name: t("Exemple", "Example"), color: example.color, example: true },
  ];
  const book = chosen ? await realBook(chosen, viewer) : example;
  return { tabs, book };
}

async function realBook(book: Book, viewer: Viewer | null): Promise<DashboardBook> {
  // l'un après l'autre : chacun fait avancer la simulation (une seule écriture)
  const live = await liveStats([book]);
  const [days, detail] = await Promise.all([dailyReturns(book), loadBookDetail(book, viewer)]);
  const now = live.get(book.id);
  const visible = detail.contents.access ? detail.contents.strategies : [];
  return {
    id: book.id,
    name: book.name,
    color: book.color,
    description: book.description,
    example: false,
    stats: book.stats
      ? {
          strategies: book.stats.strategies,
          sharpe: book.stats.sharpe,
          maxDrawdown: book.stats.maxDrawdown,
          dayReturn: now?.dayReturn ?? 0,
          allTime: now?.allTime ?? book.stats.allTime,
          weekReturn: now?.weekReturn,
        }
      : null,
    days,
    members: detail.members,
    groups: detail.groups,
    links: detail.links,
    strategies: visible.map((s) => ({
      memberId: s.memberId,
      author: s.author,
      authorHref: s.authorHref,
      self: s.self,
      deposited: s.deposited,
      title: s.title,
      market: s.market,
      summary: s.summary,
      status: s.status,
      score: s.score,
    })),
    hiddenStrategies: Math.max(0, detail.members.length - visible.length),
  };
}
