/** Modèle du backtest des books (partagé : serveur et book d'exemple). */

/**
 * Un jour de backtest : positif 60 % du temps, mais des hausses un peu plus
 * petites que les baisses (moyennes 0,5 % et 0,62 % pour 6 stratégies, × √(6 / n)),
 * soit environ +18 % par an et un Sharpe proche de 1,4 : un backtest crédible
 * sur 10 ans. Renvoie un rendement en %.
 */
export function backtestDay(strategies: number, random: () => number = Math.random): number {
  const scale = Math.sqrt(6 / Math.max(1, strategies));
  const up = random() < 0.6;
  let u = 0;
  while (u === 0) u = random();
  const halfNormal = Math.abs(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())) * Math.sqrt(Math.PI / 2);
  return (up ? 0.5 : -0.62) * scale * halfNormal;
}
