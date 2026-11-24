// Fichier de validation de Google Search Console (propriété fleija.live) : à garder tant que le site y est suivi.
export const dynamic = "force-static";

export function GET() {
  return new Response("google-site-verification: googlee8b876e7182ebf2c.html", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
