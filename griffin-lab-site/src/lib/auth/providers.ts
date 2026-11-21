/**
 * Fournisseurs OAuth proposés sur la page /sign-in, dans l'ordre d'affichage.
 * Un fournisseur n'est actif que si ses deux variables d'environnement sont
 * définies (voir .env.example).
 */

export type OAuthProviderId = "discord" | "google";

export const oauthProviders: { id: OAuthProviderId; label: string; env: [string, string] }[] = [
  { id: "discord", label: "Discord", env: ["AUTH_DISCORD_ID", "AUTH_DISCORD_SECRET"] },
  { id: "google", label: "Google", env: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"] },
];

/** Côté serveur uniquement : lit process.env. */
export function isProviderConfigured(id: OAuthProviderId): boolean {
  const provider = oauthProviders.find((p) => p.id === id);
  return !!provider && provider.env.every((key) => !!process.env[key]);
}
