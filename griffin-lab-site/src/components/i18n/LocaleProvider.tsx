"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeT, type Locale } from "@/lib/i18n/core";
import "@/lib/i18n/en-messages";
import { translateMessage } from "@/lib/i18n/messages";

const LocaleContext = createContext<Locale>("fr");

/** Donne la langue courante aux composants client (lue côté serveur dans le layout). */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

export function useT() {
  const locale = useLocale();
  return useMemo(() => makeT(locale), [locale]);
}

/** Traduit un message du serveur ou de la validation (voir lib/i18n/messages.ts). */
export function useMessage() {
  const locale = useLocale();
  return useMemo(() => (text: string | null | undefined) => translateMessage(text, locale), [locale]);
}
