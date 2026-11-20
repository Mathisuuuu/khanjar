/** Formatage des nombres et dates à la française (virgule décimale, espace insécable). */

const MINUS = "−"; // vrai signe moins typographique

export function formatNumber(value: number, decimals = 2): string {
  return value
    .toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    .replace("-", MINUS);
}

/** Pourcentage signé : +7,4 % / −8,1 %. */
export function formatPercent(value: number, decimals = 1, signed = true): string {
  const sign = value > 0 && signed ? "+" : "";
  return `${sign}${formatNumber(value, decimals)} %`;
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
