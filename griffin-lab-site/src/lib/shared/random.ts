/**
 * Générateurs déterministes : la même graine donne toujours la même courbe,
 * ce qui évite les écarts d'hydratation entre serveur et navigateur.
 */

/** Générateur pseudo-aléatoire de Park-Miller, renvoie des valeurs dans [0, 1). */
export function seededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

/** Série de rendement cumulée simulée (base 100). */
export function simulatedSeries(seed: number, drift: number, length = 90, volatility = 0.006): number[] {
  const random = seededRandom(seed);
  const points: number[] = [];
  let value = 100;
  for (let i = 0; i < length; i++) {
    value *= 1 + drift + (random() - 0.5) * volatility;
    points.push(value);
  }
  return points;
}
