"use client";

import Link from "next/link";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { StatusPill } from "@/components/proposals/StatusPill";
import styles from "./Dashboard.module.css";
import type { DashStrategy } from "./types";

/** Couleurs des marchés, dans un ordre fixe (un marché garde sa couleur). */
const PALETTE = ["#38bdf8", "#a855f7", "#f5b524", "#22c55e", "#f472b6", "#2dd4bf", "#fb923c", "#94a3b8"];

/** Tuile 2 : les stratégies du book, avec leur répartition par marché. */
export function StrategiesTile({
  strategies,
  hidden,
  bookHref,
}: {
  strategies: DashStrategy[];
  hidden: number;
  bookHref: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const deposited = strategies.filter((s) => s.deposited);
  const counts = new Map<string, number>();
  for (const s of deposited) counts.set(s.market || t("Autre", "Other"), (counts.get(s.market || t("Autre", "Other")) ?? 0) + 1);
  const markets = [...counts].sort((a, b) => b[1] - a[1]);
  const colorOf = (market: string) => PALETTE[Math.max(0, markets.findIndex(([m]) => m === market)) % PALETTE.length];
  const marketLabel = (m: string) => (locale === "en" ? m.replace("(pétrole)", "(crude oil)").replace("(or)", "(gold)").replace("Actions US", "US stocks").replace("Multi-actifs", "Multi-asset").replace("Autre", "Other") : m);

  return (
    <div className={styles.strategies}>
      {markets.length > 0 && (
        <div className={styles.split}>
          <div className={styles.splitBar} role="img" aria-label={markets.map(([m, n]) => `${marketLabel(m)} : ${n}`).join(", ")}>
            {markets.map(([m, n]) => (
              <span key={m} style={{ flexGrow: n, background: colorOf(m) }} />
            ))}
          </div>
          <ul className={styles.splitLegend}>
            {markets.map(([m, n]) => (
              <li key={m}>
                <i style={{ background: colorOf(m) }} aria-hidden="true" />
                {marketLabel(m)} <b>{n}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className={styles.strategyList}>
        {strategies.map((s, i) => (
          <li key={s.memberId}>
            <details className={styles.strategy}>
              <summary>
                <span className={styles.strategyIndex} style={s.deposited ? { borderColor: colorOf(s.market || t("Autre", "Other")) } : undefined}>
                  {i + 1}
                </span>
                <span className={styles.strategyMain}>
                  <b>{s.deposited ? s.title || t("Stratégie sans titre", "Untitled strategy") : t("Fiche pas encore déposée", "No strategy sheet yet")}</b>
                  <small>
                    {s.authorHref ? (
                      <Link href={s.authorHref} onClick={(e) => e.stopPropagation()}>
                        {s.author}
                      </Link>
                    ) : (
                      s.author
                    )}
                    {s.self && t(" (toi)", " (you)")}
                    {s.market && ` · ${marketLabel(s.market)}`}
                  </small>
                </span>
                {s.status && <StatusPill status={s.status} />}
              </summary>
              <div className={styles.strategyBody}>
                {s.summary ? <p>{s.summary}</p> : <p className={styles.muted}>{t("Pas encore de description.", "No description yet.")}</p>}
                {s.score !== undefined && (
                  <p className={styles.score}>
                    {t("Note du script de test", "Test script score")} <b>{s.score}</b>/100
                    <span className={styles.scoreBar} aria-hidden="true">
                      <i style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }} />
                    </span>
                  </p>
                )}
                {bookHref && (
                  <Link href={bookHref} className={styles.textLink}>
                    {t("Voir la fiche complète dans le book →", "See the full sheet in the book →")}
                  </Link>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>

      {hidden > 0 && (
        <p className={styles.locked}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          {hidden === 1
            ? t("1 autre stratégie, visible seulement par les membres autorisés.", "1 more strategy, visible only to authorised members.")
            : t(`${hidden} autres stratégies, visibles seulement par les membres autorisés.`, `${hidden} more strategies, visible only to authorised members.`)}
        </p>
      )}
      {strategies.length === 0 && hidden === 0 && <p className={styles.empty}>{t("Pas encore de stratégie dans ce book.", "No strategies in this book yet.")}</p>}
    </div>
  );
}
