/** Page affichée après connexion quand aucune destination n'est demandée. */
export const DEFAULT_AFTER_SIGN_IN = "/account";

/**
 * N'accepte que des chemins internes (« /submit », « /account?x=1 »…) pour
 * éviter qu'un lien piégé ne renvoie vers un autre site après la connexion.
 */
export function safeCallbackUrl(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AFTER_SIGN_IN;
  if (!value.startsWith("/") || value.length > 512) return DEFAULT_AFTER_SIGN_IN;
  // les navigateurs ignorent tabulations et retours à la ligne dans une adresse, et lisent « \ » comme « / » :
  // « /\t/site.com » ou « /\site.com » deviendraient « //site.com », un autre site
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return DEFAULT_AFTER_SIGN_IN;
  if (value.startsWith("//")) return DEFAULT_AFTER_SIGN_IN;
  return value;
}
