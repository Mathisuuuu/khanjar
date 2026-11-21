import { improvementSteps } from "@/content/home";
import { formatNumber, formatPercent } from "@/lib/format";
import { getLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n/core";
import styles from "./ImprovementStats.module.css";

/** Progression du bot entier entre la première et la dernière étape de `improvementSteps`. */
export async function ImprovementStats() {
  const locale = await getLocale();
  const t = makeT(locale);
  const first = improvementSteps[0];
  const current = improvementSteps[improvementSteps.length - 1];

  const stats = [
    { label: t("Stratégies dans le bot", "Strategies in the bot"), from: String(first.strategies), to: String(current.strategies) },
    {
      label: t("Sharpe · du book", "Sharpe · of the book"),
      from: formatNumber(first.sharpe, 2, locale),
      to: formatNumber(current.sharpe, 2, locale),
    },
    {
      label: t("Drawdown max · du book", "Max drawdown · of the book"),
      from: formatPercent(first.maxDrawdown, 1, true, locale),
      to: formatPercent(current.maxDrawdown, 1, true, locale),
    },
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
