/** Formatage des nombres et dates selon la langue (français par défaut : virgule décimale, espace insécable). */
import { intlLocale, type Locale } from "@/lib/i18n/core";

const MINUS = "−"; // vrai signe moins typographique

export function formatNumber(value: number, decimals = 2, locale: Locale = "fr"): string {
  return value
    .toLocaleString(intlLocale(locale), { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    .replace("-", MINUS);
}

/** Pourcentage signé : +7,4 % / −8,1 % (en anglais : +7.4% / −8.1%). */
export function formatPercent(value: number, decimals = 1, signed = true, locale: Locale = "fr"): string {
  const sign = value > 0 && signed ? "+" : "";
  return `${sign}${formatNumber(value, decimals, locale)}${locale === "en" ? "%" : " %"}`;
}

export function formatShortDate(iso: string, locale: Locale = "fr"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short" });
}
