import "server-only";
import { loops as fallbackLoops, type Loop } from "@/content/home";
import { listHomeBooks } from "./repository";
import { liveStats } from "./simulation";

/**
 * Books A, B, C de l'accueil. Sharpe, drawdown et nombre de stratégies
 * viennent de la base (modifiables par l'équipe sur /books) ; le rendement du
 * mois et la courbe de la semaine viennent de la simulation horaire
 * (lib/books/simulation.ts). La couleur du badge reste celle de content/home.ts.
 * Si la base ne répond pas, on garde les valeurs du fichier.
 */
export async function getHomeLoops(): Promise<Loop[]> {
  try {
    const books = await listHomeBooks();
    const live = await liveStats(books);
    return fallbackLoops.map((loop) => {
      const book = books.find((b) => b.letter === loop.id);
      if (!book?.stats) return loop;
      const now = live.get(book.id);
      return {
        ...loop,
        name: book.name,
        strategies: book.stats.strategies,
        sharpe: book.stats.sharpe,
        maxDrawdown: book.stats.maxDrawdown,
        monthReturn: now?.monthReturn ?? book.stats.monthReturn,
        week: now?.week,
        weekReturn: now?.weekReturn,
      };
    });
  } catch (error) {
    console.error("Chiffres des books indisponibles :", error);
    return fallbackLoops;
  }
}
