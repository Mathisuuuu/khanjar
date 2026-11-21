/**
 * Messages renvoyés par le serveur ou la validation (zod), écrits en français.
 * Plutôt que de faire suivre la langue jusque dans chaque schéma et chaque action,
 * le texte est traduit à l'affichage avec cette table. Un message absent reste en français.
 */
import type { Locale } from "./core";

const EN: Record<string, string> = {};

/** Ajoute des traductions (appelé par les fichiers de messages). */
export function addMessages(entries: Record<string, string>) {
  Object.assign(EN, entries);
}

export function translateMessage(text: string | null | undefined, locale: Locale): string {
  if (!text) return "";
  if (locale !== "en") return text;
  return EN[text] ?? text;
}
