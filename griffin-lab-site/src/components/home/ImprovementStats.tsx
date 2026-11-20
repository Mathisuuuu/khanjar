import { improvementSteps } from "@/content/home";
import { formatNumber, formatPercent } from "@/lib/format";
import styles from "./ImprovementStats.module.css";

/** Progression du bot entier entre la première et la dernière étape de `improvementSteps`. */
export function ImprovementStats() {
  const first = improvementSteps[0];
  const current = improvementSteps[improvementSteps.length - 1];

  const stats = [
    { label: "Stratégies dans le bot", from: String(first.strategies), to: String(current.strategies) },
    { label: "Sharpe · bot entier", from: formatNumber(first.sharpe), to: formatNumber(current.sharpe) },
    { label: "Drawdown max · bot entier", from: formatPercent(first.maxDrawdown), to: formatPercent(current.maxDrawdown) },
  ];

  return (
    <div className={styles.stats}>
      {stats.map((stat) => (
        <div key={stat.label} className={styles.stat}>
          <span>{stat.label}</span>
          <div>
            {stat.from} → <b>{stat.to}</b>
          </div>
        </div>
      ))}
    </div>
  );
}
