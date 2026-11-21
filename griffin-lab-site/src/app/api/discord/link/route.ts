import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { consume } from "@/lib/security/rate-limit";
import { authorizeUrl, LINK_PATH, LINK_STATE_COOKIE, linkConfigured, siteUrl } from "@/lib/discord/oauth";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

/**
 * GET /api/discord/link : envoie la personne connectée (compte e-mail ou Google)
 * sur Discord pour lier son compte. Un jeton aléatoire, gardé dans un cookie
 * réservé à ce chemin, empêche un autre site de lier son propre Discord à ce compte.
 */
export async function GET() {
  const viewer = await getViewer();
  const base = new URL(siteUrl()); // derrière nginx, l'adresse de la requête est interne
  if (!viewer) return NextResponse.redirect(new URL("/sign-in?callbackUrl=/account", base));
  if (viewer.id.startsWith("discord:") || !linkConfigured()) return NextResponse.redirect(new URL("/account", base));
  if (!(await consume(`discord-link:${viewer.id}`, 10, 3600))) {
    return NextResponse.redirect(new URL("/account?discord=limit#profil", base));
  }

  const state = randomBytes(32).toString("base64url");
  const response = NextResponse.redirect(authorizeUrl(state));
  response.cookies.set(LINK_STATE_COOKIE, `${state}.${Buffer.from(viewer.id).toString("base64url")}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: LINK_PATH,
    maxAge: 600,
  });
  return response;
}
