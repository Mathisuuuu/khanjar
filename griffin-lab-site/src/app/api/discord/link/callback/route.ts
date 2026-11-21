import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { saveDiscordLink } from "@/lib/discord/links";
import { fetchDiscordIdentity, LINK_PATH, LINK_STATE_COOKIE, siteUrl } from "@/lib/discord/oauth";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * GET /api/discord/link/callback : retour de Discord. Le jeton du cookie doit
 * correspondre, et la personne doit être la même qu'au départ.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const back = (status: string) => {
    const response = NextResponse.redirect(new URL(`/account?discord=${status}#profil`, siteUrl()));
    response.cookies.set(LINK_STATE_COOKIE, "", { path: LINK_PATH, maxAge: 0 });
    return response;
  };

  const viewer = await getViewer();
  const cookie = request.cookies.get(LINK_STATE_COOKIE)?.value ?? "";
  const [state, owner] = cookie.split(".");
  const code = url.searchParams.get("code");
  const returned = url.searchParams.get("state") ?? "";

  if (!viewer || !state || !owner || !code || code.length > 200) return back("error");
  if (!same(state, returned) || !same(owner, Buffer.from(viewer.id).toString("base64url"))) return back("error");
  if (viewer.id.startsWith("discord:")) return back("error");

  try {
    const identity = await fetchDiscordIdentity(code);
    if (!identity) return back("error");
    await saveDiscordLink(viewer.id, identity.id, identity.avatar);
    return back("linked");
  } catch (error) {
    console.error("Liaison Discord impossible :", error instanceof Error ? error.message : error);
    return back("error");
  }
}
