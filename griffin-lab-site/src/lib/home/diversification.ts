/**
 * Illustration de la section « Le book en plus » : ce que la diversification
 * apporte à une stratégie. Courbes illustratives, pas une simulation de marché :
 * chaque courbe suit une tendance (le rendement final visé) plus un bruit qui y
 * revient, avec des chutes ponctuelles d'autant plus fortes qu'il y a peu de
 * stratégies. La graine est fixe : les courbes sont les mêmes à chaque visite
 * (choisie pour que 10 > 5 > 2 en rendement, et l'inverse en drawdown).
 * Un point par semaine sur 3 ans. Ce ne sont pas des performances réelles.
 */

export type DiversificationSeries = {
  count: number;
  /** Rendement cumulé en %, un point par semaine. */
  returns: number[];
  /** Repli depuis le plus haut en % (≤ 0), un point par semaine. */
  drawdown: number[];
  finalReturn: number;
  maxDrawdown: number;
};

export const DIVERSIFICATION_COUNTS = [2, 5, 10] as const;
export const DIVERSIFICATION_YEARS = 3;
const WEEKS = DIVERSIFICATION_YEARS * 52;
const SEED = 90887;

/**
 * Rendement sur 3 ans, bruit hebdomadaire, taille et fréquence des chutes,
 * vitesse de récupération (`keep` proche de 1 = reste longtemps sous l'eau),
 * courbure de la tendance (`bend` > 1 = monte plus vite au début).
 */
const PROFILE: Record<number, { total: number; noise: number; drop: number; dropOdds: number; keep: number; bend: number }> = {
  2: { total: 0.2, noise: 0.013, drop: 0.09, dropOdds: 0.05, keep: 0.975, bend: 1 },
  5: { total: 0.46, noise: 0.008, drop: 0.065, dropOdds: 0.04, keep: 0.95, bend: 1.6 },
  10: { total: 0.63, noise: 0.0045, drop: 0.025, dropOdds: 0.04, keep: 0.88, bend: 2.2 },
};

function random(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(next: () => number) {
  let u = 0;
  let v = 0;
  while (!u) u = next();
  while (!v) v = next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function build(count: number): DiversificationSeries {
  const next = random(SEED * 97 + count);
  const { total, noise, drop, dropOdds, keep, bend } = PROFILE[count];

  // écart à la tendance : revient vers 0, avec des chutes ponctuelles
  let gap = 0;
  const gaps = [0];
  for (let week = 0; week < WEEKS; week++) {
    gap = gap * keep + noise * gaussian(next) - (next() < dropOdds ? drop * (0.6 + 0.8 * next()) : 0);
    gaps.push(gap);
  }
  // écart recentré, qui apparaît sur les 10 premières semaines et s'efface sur les 12 dernières :
  // chaque courbe part de 0 et finit exactement sur le rendement visé, en montant
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const logValue = gaps.map((g, week) => {
    const fade = Math.min(1, week / 10) * Math.min(1, (WEEKS - week) / 12);
    return Math.log(1 + total) * (1 - (1 - week / WEEKS) ** bend) + (g - mean) * fade;
  });

  let peak = 0;
  let maxDrawdown = 0;
  const drawdown = logValue.map((v) => {
    peak = Math.max(peak, v);
    const dd = (Math.exp(v - peak) - 1) * 100;
    maxDrawdown = Math.min(maxDrawdown, dd);
    return dd;
  });
  const returns = logValue.map((v) => (Math.exp(v) - 1) * 100);
  return { count, returns, drawdown, finalReturn: returns[WEEKS], maxDrawdown };
}

export const diversificationSeries = DIVERSIFICATION_COUNTS.map(build);
