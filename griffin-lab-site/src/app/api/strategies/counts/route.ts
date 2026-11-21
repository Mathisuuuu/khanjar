import { NextResponse } from "next/server";
import { getStrategyCounts, type StrategyCounts } from "@/lib/proposals/counts";

export const dynamic = "force-dynamic";

/**
 * GET /api/strategies/counts : compteurs publics de l'accueil (en attente, validées, refusées).
 * Gardés 30 s en mémoire : une rafale de requêtes ne touche pas la base.
 */
let cache: { at: number; data: StrategyCounts } | null = null;

export async function GET() {
  if (!cache || Date.now() - cache.at > 30_000) cache = { at: Date.now(), data: await getStrategyCounts() };
  return NextResponse.json(cache.data, { headers: { "Cache-Control": "public, max-age=30" } });
}
