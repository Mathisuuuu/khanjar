import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { isLocale, LOCALE_COOKIE, makeT, type Locale } from "./core";
import "./en-messages";
import { translateMessage } from "./messages";

/**
 * Langue de la requête : celle choisie dans les paramètres du compte (cookie),
 * sinon celle du navigateur (français si elle commence par « fr », anglais sinon).
 */
export const getLocale = cache(async (): Promise<Locale> => {
  return (await getChosenLocale()) ?? (await getBrowserLocale());
});

/** Langue forcée dans les paramètres du compte (cookie), ou `null` : celle du navigateur. */
export async function getChosenLocale(): Promise<Locale | null> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(chosen) ? chosen : null;
}

/** Langue du navigateur (en-tête Accept-Language) : français si elle commence par « fr », anglais sinon. */
export async function getBrowserLocale(): Promise<Locale> {
  const accept = (await headers()).get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!first) return "fr";
  return first.startsWith("fr") ? "fr" : "en";
}

export async function getT() {
  return makeT(await getLocale());
}

/** Traduit un message du serveur (voir lib/i18n/messages.ts). */
export async function getMessage() {
  const locale = await getLocale();
  return (text: string | null | undefined) => translateMessage(text, locale);
}
