import Link from "next/link";
import type { CSSProperties } from "react";
import { strategyStats, type LoopColor, type StrategyStat } from "@/content/home";
import { getHomeLoops } from "@/lib/books/home";
import { getStrategyCounts } from "@/lib/proposals/counts";
import { formatNumber, formatPercent } from "@/lib/shared/format";
import { makeT } from "@/lib/i18n/core";
import { getLocale } from "@/lib/i18n/server";
import { Sparkline } from "./Sparkline";
import styles from "./Board.module.css";

/**
 * Tableau du bot affiché sous le hero : les books (avec leur courbe de la
 * semaine) puis l'état des stratégies proposées.
 */

const loopRgb: Record<LoopColor, string> = {
  cyan: "56,189,248",
  violet: "168,85,247",
  amber: "245,181,36",
};

const statusIcon: Record<StrategyStat["status"], React.ReactNode> = {
  pending: (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="none" stroke="#F5B524" strokeWidth="1.8" />
      <path d="M9 5.5V9l2.4 1.6" fill="none" stroke="#F5B524" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  validated: (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="none" stroke="#22C55E" strokeWidth="1.8" />
      <path d="m5.8 9.2 2.2 2.2 4.2-4.6" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  rejected: (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="none" stroke="#EF4444" strokeWidth="1.8" />
      <path d="m6.5 6.5 5 5m0-5-5 5" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export async function Board() {
  const [loops, locale, counts] = await Promise.all([getHomeLoops(), getLocale(), getStrategyCounts()]);
  const t = makeT(locale);
  // chiffres de départ + propositions réelles (lib/proposals/counts.ts)
  const stats = strategyStats(t).map((stat) => ({ ...stat, total: counts[stat.status].total, thisWeek: counts[stat.status].week }));
  const pct = (value: number) => formatPercent(value, 1, true, locale);
  const totalStrategies = stats.reduce((sum, stat) => sum + stat.total, 0);

  return (
    <figure className={styles.board} aria-label={t("Aperçu du bot : books et stratégies proposées", "Bot overview: books and submitted strategies")}>
      {/* Books */}
      <div className={`${styles.group} ${styles.loopGrid}`}>
        <b className={styles.groupTitle}>
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="6" cy="9" r="4.2" fill="none" stroke="#38BDF8" strokeWidth="1.8" />
            <circle cx="12" cy="9" r="4.2" fill="none" stroke="#38BDF8" strokeWidth="1.8" />
          </svg>
          Books <span className={styles.count}>{loops.length}</span>
        </b>
        <span className={`${styles.col} ${styles.hideMd}`}>{t("Rendement · semaine", "Return · week")}</span>
        <span className={`${styles.col} ${styles.hideMd}`}>Sharpe</span>
        <span className={`${styles.col} ${styles.hideMd}`}>DD max</span>
        <span className={`${styles.col} ${styles.end}`}>{t("1 J", "1 D")}</span>
        <span className={`${styles.col} ${styles.end}`}>All time</span>
      </div>

      {loops.map((loop) => (
        <div key={loop.id} className={`${styles.row} ${styles.loopGrid} ${styles.loopRow}`}>
          <div className={styles.name}>
            <span className={styles.loopId} style={{ "--c": loopRgb[loop.color] } as CSSProperties}>
              {loop.id}
            </span>
            <div>
              <b>{loop.name}</b>
              <small>{loop.strategies} {t("stratégies", "strategies")}</small>
            </div>
          </div>
          <Sparkline
            points={loop.week}
            seed={loop.series.seed}
            drift={loop.series.drift}
            className={`${styles.spark} ${styles.hideSm}`}
            label={
              loop.weekReturn !== undefined
                ? t(`${loop.name} : ${pct(loop.weekReturn)} sur 7 jours`, `${loop.name}: ${pct(loop.weekReturn)} over 7 days`)
                : undefined
            }
          />
          <span className={`${styles.tag} ${styles.hideMd}`}>
            <i style={{ background: loop.sharpe >= 1.3 ? "#22C55E" : "#F5B524" }} />
            Sharpe {formatNumber(loop.sharpe, 2, locale)}
          </span>
          <span className={`${styles.muted} ${styles.hideMd}`}>{pct(loop.maxDrawdown)}</span>
          <span className={`${styles.month} ${loop.dayReturn < 0 ? styles.negative : ""}`}>{pct(loop.dayReturn)}</span>
          <span className={styles.allTime}>{loop.allTime === null ? "—" : pct(loop.allTime)}</span>
        </div>
      ))}

      {/* Stratégies */}
      <div className={`${styles.group} ${styles.statGrid}`}>
        <b className={styles.groupTitle}>
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <rect x="2.5" y="3" width="13" height="12" rx="2.5" fill="none" stroke="#C9CCD1" strokeWidth="1.8" />
            <path d="M6 7h6M6 11h4" stroke="#C9CCD1" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {t("Stratégies", "Strategies")} <span className={styles.count}>{totalStrategies}</span>
        </b>
        <span className={`${styles.col} ${styles.hideMd}`}>{t("Cette semaine", "This week")}</span>
        <span className={`${styles.col} ${styles.hideSm}`}>{t("À savoir", "Good to know")}</span>
        <span className={`${styles.col} ${styles.end}`}>Total</span>
      </div>

      {stats.map((stat) => (
        <div key={stat.status} className={`${styles.row} ${styles.statGrid}`}>
          <div className={styles.name}>
            <span className={styles.statusIcon}>{statusIcon[stat.status]}</span>
            <b>{stat.label}</b>
          </div>
          <span className={`${styles.week} ${styles.hideMd}`}>+{stat.thisWeek}</span>
          <div className={`${styles.fact} ${styles.hideSm}`}>
            <span>{stat.factLabel}</span>
            <b>{stat.factValue}</b>
          </div>
          <span className={`${styles.total} ${stat.status === "validated" ? styles.positive : ""}`}>{stat.total}</span>
        </div>
      ))}

      <figcaption className={styles.caption}>
        <span>
          {t(
            "Un book regroupe plusieurs stratégies décorrélées. Quand deux stratégies sont corrélées, la nouvelle rejoint un autre book.",
            "A book groups several uncorrelated strategies. When two strategies are correlated, the new one joins another book.",
          )}
        </span>
        <Link href="/submit">{t("Voir votre file", "See your queue")}</Link>
      </figcaption>
    </figure>
  );
}
