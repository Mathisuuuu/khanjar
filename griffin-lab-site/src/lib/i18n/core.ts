/**
 * Langues du site. Le texte reste à côté du code qui l'affiche :
 * `t("Bonjour", "Hello")` renvoie la version de la langue courante.
 * Le contenu publié par les membres (propositions, recherches…) n'est pas traduit.
 */
export type Locale = "fr" | "en";

export const LOCALES: Locale[] = ["fr", "en"];

/** Cookie qui mémorise la langue choisie avec le bouton FR / EN. */
export const LOCALE_COOKIE = "lang";

export type T = <A>(fr: A, en: A) => A;

export const makeT =
  (locale: Locale): T =>
  (fr, en) =>
    locale === "en" ? en : fr;

export const isLocale = (value: unknown): value is Locale => value === "fr" || value === "en";

/** Code BCP 47 pour Intl (dates, nombres). */
export const intlLocale = (locale: Locale) => (locale === "en" ? "en-GB" : "fr-FR");
