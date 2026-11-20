/** Page affichée après connexion quand aucune destination n'est demandée. */
export const DEFAULT_AFTER_SIGN_IN = "/compte";

/**
 * N'accepte que des chemins internes (« /proposer », « /compte?x=1 »…) pour
 * éviter qu'un lien piégé ne renvoie vers un autre site après la connexion.
 */
export function safeCallbackUrl(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AFTER_SIGN_IN;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_AFTER_SIGN_IN;
  return value;
}
