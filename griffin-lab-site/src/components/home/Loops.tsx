import type { CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CORRELATION_LIMIT, newStrategyExample, type LoopColor } from "@/content/home";
import { getHomeLoops } from "@/lib/books/home";
import { formatNumber } from "@/lib/format";
import { ImprovementStats } from "./ImprovementStats";
import styles from "./Loops.module.css";

/**
 * Section 04 : une nouvelle stratégie validée est comparée à chaque book.
 * Elle rejoint celle où sa corrélation est sous le seuil ; les autres lui
 * sont fermées. En dessous, la progression du bot entier.
 */

const loopRgb: Record<LoopColor, string> = {
  cyan: "56,189,248",
  violet: "168,85,247",
  amber: "245,181,36",
};

/** Ordonnées (viewBox 0–300) du centre de chaque ligne de book : 3 lignes de même hauteur. */
const rowCenter = (index: number, count: number) => ((index + 0.5) / count) * 300;

export async function Loops() {
  const loops = await getHomeLoops();
  const routes = loops.map((loop) => {
    const rho = newStrategyExample.correlation[loop.id] ?? 1;
    return { loop, rho, accepted: rho < CORRELATION_LIMIT };
  });
  const limit = formatNumber(CORRELATION_LIMIT, 1);

  return (
    <Section id="books" tone="alt">
      <SectionHeading kicker="04 · Les books" title="Chaque stratégie ajoutée rend le bot meilleur." align="center">
        Le bot est fait de books de stratégies peu corrélées. Une stratégie validée rejoint le book où elle apporte
        de la diversification : là où sa corrélation reste sous {limit}.
      </SectionHeading>

      <div className={styles.stage}>
        {/* Nouvelle stratégie */}
        <div className={styles.strategy}>
          <span className={styles.eyebrow}>
            <i className={styles.pulse} /> nouvelle stratégie
          </span>
          <b className={styles.strategyName}>{newStrategyExample.name}</b>
          <span className={styles.strategyMeta}>score {newStrategyExample.score}/100 · validée</span>
          <span className={styles.strategyRule}>
            cherche un book où <em>ρ &lt; {limit}</em>
          </span>
        </div>

        {/* Liaisons vers chaque book */}
        <div className={styles.links}>
          <svg viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true">
            {routes.map((r, i) => {
              const y = rowCenter(i, routes.length);
              return (
                <path
                  key={r.loop.id}
                  d={`M0 150 C 55 150, 45 ${y}, 100 ${y}`}
                  className={r.accepted ? styles.linkOk : styles.linkKo}
                />
              );
            })}
          </svg>
        </div>

        {/* Books */}
        <ul className={styles.loops}>
          {routes.map((r) => (
            <li key={r.loop.id} className={styles.loopRow}>
              <div
                className={`glass ${styles.loop} ${r.accepted ? styles.loopTarget : styles.loopClosed}`}
                style={{ "--c": loopRgb[r.loop.color] } as CSSProperties}
              >
                <span className={styles.loopId}>{r.loop.id}</span>
                <span className={styles.loopText}>
                  <b>{r.loop.name}</b>
                  <small>
                    {r.accepted ? (
                      <>
                        {r.loop.strategies} → <em>{r.loop.strategies + 1} stratégies</em>
                      </>
                    ) : (
                      `${r.loop.strategies} stratégies`
                    )}
                  </small>
                </span>
                <span className={`${styles.verdict} ${r.accepted ? styles.verdictOk : styles.verdictKo}`}>
                  ρ {formatNumber(r.rho)}
                  <span>{r.accepted ? "rejoint" : "trop corrélée"}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ImprovementStats />
    </Section>
  );
}
