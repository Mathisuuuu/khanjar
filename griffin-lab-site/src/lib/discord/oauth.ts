import "server-only";

/**
 * Liaison d'un compte Discord à un compte e-mail ou Google (photo de profil).
 * Autorisation Discord minimale (« identify ») : on ne lit que l'identifiant et
 * la photo. La session du site ne change pas.
 */

export const LINK_STATE_COOKIE = "discord_link_state";
export const LINK_PATH = "/api/discord/link";

export const siteUrl = () => (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const redirectUri = () => `${siteUrl()}${LINK_PATH}/callback`;
export const linkConfigured = () => !!process.env.AUTH_DISCORD_ID && !!process.env.AUTH_DISCORD_SECRET;

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.AUTH_DISCORD_ID ?? "",
    response_type: "code",
    scope: "identify",
    redirect_uri: redirectUri(),
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

/** Échange le code contre l'identité Discord ; `null` si Discord refuse. */
export async function fetchDiscordIdentity(code: string): Promise<{ id: string; avatar: string | null } | null> {
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_DISCORD_ID ?? "",
      client_secret: process.env.AUTH_DISCORD_SECRET ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenRes.ok) return null;
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
  if (!accessToken) return null;
  const userRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!userRes.ok) return null;
  const user = (await userRes.json()) as { id?: string; avatar?: string | null };
  // le jeton d'accès n'est plus utile : on le révoque aussitôt
  void fetch("https://discord.com/api/oauth2/token/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_DISCORD_ID ?? "",
      client_secret: process.env.AUTH_DISCORD_SECRET ?? "",
      token: accessToken,
    }),
  }).catch(() => undefined);
  return typeof user.id === "string" ? { id: user.id, avatar: user.avatar ?? null } : null;
}
