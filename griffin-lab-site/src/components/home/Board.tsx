import Link from "next/link";
import type { CSSProperties } from "react";
import { strategyStats, type LoopColor, type StrategyStat } from "@/content/home";
import { getHomeLoops } from "@/lib/books/home";
import { formatNumber, formatPercent } from "@/lib/format";
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
  const loops = await getHomeLoops();
  const totalStrategies = strategyStats.reduce((sum, stat) => sum + stat.total, 0);

  return (
    <figure className={styles.board} aria-label="Aperçu du bot : books et stratégies proposées">
      {/* Books */}
      <div className={`${styles.group} ${styles.loopGrid}`}>
        <b className={styles.groupTitle}>
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="6" cy="9" r="4.2" fill="none" stroke="#38BDF8" strokeWidth="1.8" />
            <circle cx="12" cy="9" r="4.2" fill="none" stroke="#38BDF8" strokeWidth="1.8" />
          </svg>
          Books <span className={styles.count}>{loops.length}</span>
        </b>
        <span className={`${styles.col} ${styles.hideMd}`}>Rendement · semaine</span>
        <span className={`${styles.col} ${styles.hideMd}`}>Sharpe</span>
        <span className={`${styles.col} ${styles.hideMd}`}>DD max</span>
        <span className={`${styles.col} ${styles.end}`}>Mois</span>
      </div>

      {loops.map((loop) => (
        <div key={loop.id} className={`${styles.row} ${styles.loopGrid} ${styles.loopRow}`}>
          <div className={styles.name}>
            <span className={styles.loopId} style={{ "--c": loopRgb[loop.color] } as CSSProperties}>
              {loop.id}
            </span>
            <div>
              <b>{loop.name}</b>
              <small>{loop.strategies} stratégies</small>
            </div>
          </div>
          <Sparkline
            points={loop.week}
            seed={loop.series.seed}
            drift={loop.series.drift}
            className={`${styles.spark} ${styles.hideSm}`}
            label={
              loop.weekReturn !== undefined
                ? `${loop.name} : ${formatPercent(loop.weekReturn)} sur 7 jours`
                : undefined
            }
          />
          <span className={`${styles.tag} ${styles.hideMd}`}>
            <i style={{ background: loop.sharpe >= 1.3 ? "#22C55E" : "#F5B524" }} />
            Sharpe {formatNumber(loop.sharpe)}
          </span>
          <span className={`${styles.muted} ${styles.hideMd}`}>{formatPercent(loop.maxDrawdown)}</span>
          <span className={styles.month}>{formatPercent(loop.monthReturn)}</span>
        </div>
      ))}

      {/* Stratégies */}
      <div className={`${styles.group} ${styles.statGrid}`}>
        <b className={styles.groupTitle}>
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <rect x="2.5" y="3" width="13" height="12" rx="2.5" fill="none" stroke="#C9CCD1" strokeWidth="1.8" />
            <path d="M6 7h6M6 11h4" stroke="#C9CCD1" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Stratégies <span className={styles.count}>{totalStrategies}</span>
        </b>
        <span className={`${styles.col} ${styles.hideMd}`}>Cette semaine</span>
        <span className={`${styles.col} ${styles.hideSm}`}>À savoir</span>
        <span className={`${styles.col} ${styles.end}`}>Total</span>
      </div>

      {strategyStats.map((stat) => (
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
          Un book regroupe plusieurs stratégies décorrélées. Quand deux stratégies sont corrélées, la nouvelle
          rejoint un autre book.
        </span>
        <Link href="/proposer">Voir la vraie file</Link>
      </figcaption>
    </figure>
  );
}
