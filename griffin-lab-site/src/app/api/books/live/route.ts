import { NextResponse } from "next/server";
import { getHomeLoops } from "@/lib/books/home";

export const dynamic = "force-dynamic";

/**
 * GET /api/books/live : chiffres publics des books A, B, C (ceux de l'accueil).
 * Lu chaque jour par le bot Discord pour le message de #books-performance.
 * Gardés 60 s en mémoire : une rafale de requêtes ne touche pas la base.
 */
type LiveBook = {
  letter: string;
  name: string;
  strategies: number;
  sharpe: number;
  maxDrawdown: number;
  monthReturn: number;
  weekReturn: number | null;
};
let cache: { at: number; data: LiveBook[] } | null = null;

export async function GET() {
  if (!cache || Date.now() - cache.at > 60_000) {
    const loops = await getHomeLoops();
    cache = {
      at: Date.now(),
      data: loops.map(({ id, name, strategies, sharpe, maxDrawdown, monthReturn, weekReturn }) => ({
        letter: id,
        name,
        strategies,
        sharpe,
        maxDrawdown,
        monthReturn,
        weekReturn: weekReturn ?? null,
      })),
    };
  }
  return NextResponse.json(cache.data, { headers: { "Cache-Control": "public, max-age=60" } });
}
