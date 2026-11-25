/**
 * Calculs des graphes du dashboard, à partir des rendements journaliers (en %).
 * Fonctions pures, utilisées côté navigateur (et pour le book d'exemple).
 */

const YEAR_DAYS = 365; // les books tournent tous les jours (crypto comprise)

/** Rendement cumulé (en %) après chaque jour, en partant de 0. */
export function cumulative(values: number[]): number[] {
  let equity = 1;
  return [0, ...values.map((v) => ((equity *= 1 + v / 100) - 1) * 100)];
}

/** Recul (en %, ≤ 0) depuis le plus haut précédent, jour après jour. */
export function drawdowns(values: number[]): number[] {
  let equity = 1;
  let peak = 1;
  return [0, ...values.map((v) => {
    equity *= 1 + v / 100;
    peak = Math.max(peak, equity);
    return (equity / peak - 1) * 100;
  })];
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const std = (values: number[]) => {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1));
};

export type Summary = {
  total: number;
  sharpe: number;
  volatility: number;
  maxDrawdown: number;
  positiveShare: number;
  best: number;
  worst: number;
  average: number;
  days: number;
};

export function summarize(values: number[]): Summary {
  const s = std(values);
  return {
    total: cumulative(values).at(-1) ?? 0,
    sharpe: s ? (mean(values) / s) * Math.sqrt(YEAR_DAYS) : 0,
    volatility: s * Math.sqrt(YEAR_DAYS),
    maxDrawdown: Math.min(0, ...drawdowns(values)),
    positiveShare: values.length ? (values.filter((v) => v > 0).length / values.length) * 100 : 0,
    best: values.length ? Math.max(...values) : 0,
    worst: values.length ? Math.min(...values) : 0,
    average: mean(values),
    days: values.length,
  };
}

/** Fenêtre glissante : `null` tant que la fenêtre n'est pas pleine. */
export function rolling(values: number[], window: number, fn: (slice: number[]) => number): (number | null)[] {
  return values.map((_, i) => (i + 1 < window ? null : fn(values.slice(i + 1 - window, i + 1))));
}

export const rollingVolatility = (values: number[], window: number) =>
  rolling(values, window, (slice) => std(slice) * Math.sqrt(YEAR_DAYS));

export const rollingSharpe = (values: number[], window: number) =>
  rolling(values, window, (slice) => {
    const s = std(slice);
    return s ? (mean(slice) / s) * Math.sqrt(YEAR_DAYS) : 0;
  });

/** Rendement de chaque mois (clé « AAAA-MM »), dans l'ordre. */
export function monthly(days: { date: string; value: number }[]): { month: string; value: number }[] {
  const months = new Map<string, number>();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    months.set(key, (months.get(key) ?? 1) * (1 + day.value / 100));
  }
  return [...months].map(([month, equity]) => ({ month, value: (equity - 1) * 100 }));
}

/** Histogramme : classes de même largeur, centrées sur 0. */
export function histogram(values: number[], bins = 21): { from: number; to: number; count: number }[] {
  if (!values.length) return [];
  const edge = Math.max(0.5, Math.ceil(Math.max(...values.map(Math.abs)) * 2) / 2);
  const width = (2 * edge) / bins;
  const result = Array.from({ length: bins }, (_, i) => ({ from: -edge + i * width, to: -edge + (i + 1) * width, count: 0 }));
  for (const v of values) result[Math.min(bins - 1, Math.max(0, Math.floor((v + edge) / width)))].count++;
  return result;
}

/** Générateur pseudo-aléatoire à graine (mulberry32) : un même tirage à chaque affichage. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MonteCarlo = {
  /** Centiles 5, 25, 50, 75, 95 du rendement cumulé (en %) à chaque jour, en partant de 0. */
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
  /** Quelques trajectoires tirées, pour l'illustration. */
  samples: number[][];
  /** Part des trajectoires qui finissent au-dessus de 0 (en %). */
  positive: number;
};

/**
 * Monte Carlo par rééchantillonnage : chaque trajectoire tire au hasard, avec
 * remise, des journées réellement observées. Montre l'éventail des issues
 * possibles si le book se comporte comme sur la période.
 */
export function monteCarlo(values: number[], horizon: number, paths = 1000, seed = 7): MonteCarlo | null {
  if (values.length < 5) return null;
  const random = seeded(seed);
  const finals: number[][] = Array.from({ length: horizon + 1 }, () => []);
  const samples: number[][] = [];
  let positive = 0;
  for (let p = 0; p < paths; p++) {
    let equity = 1;
    const path = [0];
    finals[0].push(0);
    for (let d = 1; d <= horizon; d++) {
      equity *= 1 + values[Math.floor(random() * values.length)] / 100;
      const value = (equity - 1) * 100;
      finals[d].push(value);
      path.push(value);
    }
    if (equity > 1) positive++;
    if (p < 24) samples.push(path);
  }
  const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const sorted = finals.map((list) => list.sort((a, b) => a - b));
  return {
    p5: sorted.map((l) => quantile(l, 0.05)),
    p25: sorted.map((l) => quantile(l, 0.25)),
    p50: sorted.map((l) => quantile(l, 0.5)),
    p75: sorted.map((l) => quantile(l, 0.75)),
    p95: sorted.map((l) => quantile(l, 0.95)),
    samples,
    positive: (positive / paths) * 100,
  };
}

/** Rendement de chaque année civile (clé « AAAA »), dans l'ordre. */
export function yearly(days: { date: string; value: number }[]): { year: string; value: number }[] {
  const years = new Map<string, number>();
  for (const day of days) {
    const key = day.date.slice(0, 4);
    years.set(key, (years.get(key) ?? 1) * (1 + day.value / 100));
  }
  return [...years].map(([year, equity]) => ({ year, value: (equity - 1) * 100 }));
}

export type Group = { key: string; value: number; positive: number; count: number };

/** Par mois (« AAAA-MM ») ou par année (« AAAA ») : rendement composé et nombre de jours positifs. */
export function grouped(days: { date: string; value: number }[], by: "month" | "year"): Group[] {
  const groups = new Map<string, Group>();
  for (const day of days) {
    const key = by === "month" ? day.date.slice(0, 7) : day.date.slice(0, 4);
    const g = groups.get(key) ?? { key, value: 1, positive: 0, count: 0 };
    g.value *= 1 + day.value / 100;
    g.positive += day.value > 0 ? 1 : 0;
    g.count++;
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({ ...g, value: (g.value - 1) * 100 }));
}

/** Jours positifs d'affilée à la fin de la série (0 si le dernier jour est négatif). */
export function positiveStreak(values: number[]): number {
  let streak = 0;
  for (let i = values.length - 1; i >= 0 && values[i] > 0; i--) streak++;
  return streak;
}
