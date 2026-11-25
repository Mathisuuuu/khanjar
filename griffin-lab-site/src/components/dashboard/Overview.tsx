"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { intlLocale } from "@/lib/i18n/core";
import { grouped, summarize } from "@/lib/dashboard/metrics";
import { formatNumber, formatPercent } from "@/lib/shared/format";
import { BarChart } from "./charts";
import styles from "./Dashboard.module.css";
import type { DashboardBook } from "./types";

const UP = "#22c55e";
const DOWN = "#ef4444";
const BLUE = "#3b82f6";
const MARKETS = "#a855f7";

type Mode = "all" | "backtest" | "live";

/**
 * Vue d'ensemble d'un book : raccourcis, cartes de chiffres et graphes en barres,
 * filtrés par source (backtest, live) et par période.
 */
export function Overview({ book }: { book: DashboardBook }) {
  const t = useT();
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>("all");
  const [period, setPeriod] = useState<number>(365);
  const fmt = intlLocale(locale);
  const pct = (v: number, d = 1) => formatPercent(v, d, true, locale);
  const plain = (v: number, d = 1) => formatPercent(v, d, false, locale);

  const periods = [
    { days: 30, label: t("1 mois", "1 month") },
    { days: 90, label: t("3 mois", "3 months") },
    { days: 182, label: t("6 mois", "6 months") },
    { days: 365, label: t("1 an", "1 year") },
    { days: 1095, label: t("3 ans", "3 years") },
    { days: 1826, label: t("5 ans", "5 years") },
    { days: 100_000, label: t("Depuis le début", "Lifetime") },
  ];

  const days = useMemo(() => {
    const complete = book.days.filter((d) => !d.partial);
    const source = mode === "all" ? complete : complete.filter((d) => (mode === "backtest" ? d.backtest : !d.backtest));
    return source.slice(-period);
  }, [book.days, mode, period]);
  const values = useMemo(() => days.map((d) => d.value), [days]);
  const summary = useMemo(() => summarize(values), [values]);
  const byYear = days.length > 730;
  const groups = useMemo(() => grouped(days, byYear ? "year" : "month"), [days, byYear]);
  const negative = summary.days - Math.round((summary.positiveShare / 100) * summary.days);

  const groupLabel = (key: string, full = false) =>
    byYear
      ? key
      : new Date(`${key}-01T00:00:00Z`).toLocaleDateString(fmt, { month: full ? "long" : "short", year: full ? "numeric" : "2-digit", timeZone: "UTC" });

  // durée couverte : « 10 a 2 m 3 j »
  const span = (() => {
    if (!days.length) return null;
    const start = new Date(`${days[0].date}T00:00:00Z`);
    const end = new Date(`${days[days.length - 1].date}T00:00:00Z`);
    let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
    let rest = end.getUTCDate() - start.getUTCDate() + 1;
    if (rest < 0) {
      months--;
      rest += 30;
    }
    return { y: Math.floor(months / 12), m: months % 12, d: rest };
  })();

  // stratégies par marché (barres horizontales)
  const markets = (() => {
    const counts = new Map<string, number>();
    for (const s of book.strategies.filter((s) => s.deposited)) counts.set(s.market || t("Autre", "Other"), (counts.get(s.market || t("Autre", "Other")) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  })();
  const maxMarket = Math.max(1, ...markets.map(([, n]) => n));

  const actions = [
    {
      href: "/submit",
      icon: <path d="M12 5v14M5 12h14" />,
      title: t("Proposer une stratégie", "Submit a strategy"),
      text: t("Idée, script ou papier", "Idea, script or paper"),
    },
    book.example
      ? { href: "/books", icon: <BookIconPath />, title: t("Voir les books", "See the books"), text: t("Les cercles de Fleija", "Fleija's circles") }
      : { href: `/books/${book.id}`, icon: <BookIconPath />, title: t("Ouvrir le book", "Open the book"), text: t("Membres et contenu", "Members and contents") },
    {
      href: "/about#rules",
      icon: <path d="M4 6l8-3 8 3-8 3zM4 10l8 3 8-3M4 14l8 3 8-3" />,
      title: t("Règles et script de test", "Rules and test script"),
      text: t("Comment une stratégie est validée", "How a strategy gets validated"),
    },
  ];

  return (
    <div className={styles.overview}>
      <div className={styles.actions}>
        {actions.map((a, i) => (
          <Link key={a.href} href={a.href} className={`${styles.action} ${i === 0 ? styles.actionMain : ""}`}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {a.icon}
              </g>
            </svg>
            <span>
              <b>{a.title}</b>
              <small>{a.text}</small>
            </span>
          </Link>
        ))}
      </div>

      <div className={styles.perfHead}>
        <h2>Performance</h2>
        <div className={styles.filters}>
          <Dropdown
            label={t("Source", "Source")}
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: "all", label: t("Backtest + live", "Backtest + live") },
              { value: "backtest", label: "Backtest" },
              { value: "live", label: "Live" },
            ]}
            icon={<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />}
          />
          <Dropdown
            label={t("Période", "Period")}
            value={String(period)}
            onChange={(v) => setPeriod(Number(v))}
            options={periods.map((p) => ({ value: String(p.days), label: p.label }))}
            icon={<path d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" />}
          />
        </div>
      </div>

      {values.length < 2 ? (
        <p className={styles.empty}>{t("Pas encore assez de jours pour ce filtre.", "Not enough days for this filter yet.")}</p>
      ) : (
        <div className={styles.perf}>
          <div className={styles.cards}>
            <StatCard title={t("Rendement", "Return")} icon={<path d="M4 18l6-6 4 4 6-8M14 8h6v6" />}>
              <strong className={summary.total >= 0 ? styles.up : styles.down}>{pct(summary.total)}</strong>
              <small>
                {t("Journée moyenne", "Average day")} {pct(summary.average, 2)}
              </small>
            </StatCard>
            <StatCard title={t("Historique couvert", "History covered")} icon={<path d="M12 7v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z" />}>
              {span && (
                <strong>
                  {span.y > 0 && (
                    <>
                      {span.y}
                      <em>{t("a", "y")}</em>{" "}
                    </>
                  )}
                  {(span.y > 0 || span.m > 0) && (
                    <>
                      {span.m}
                      <em>{t("m", "mo")}</em>{" "}
                    </>
                  )}
                  {span.d}
                  <em>{t("j", "d")}</em>
                </strong>
              )}
              <small>
                {formatNumber(summary.days, 0, locale)} {t("jours simulés", "simulated days")}
              </small>
            </StatCard>
            <StatCard title={t("Jours positifs", "Positive days")} icon={<path d="M5 13l4 4L19 7" />}>
              <strong>{plain(summary.positiveShare)}</strong>
              <span className={styles.winSplit} aria-hidden="true">
                <i style={{ width: `${summary.positiveShare}%` }} />
              </span>
              <small>
                <span className={styles.up}>
                  {formatNumber(summary.days - negative, 0, locale)} {t("en hausse", "up")}
                </span>{" "}
                ·{" "}
                <span className={styles.down}>
                  {formatNumber(negative, 0, locale)} {t("en baisse", "down")}
                </span>
              </small>
            </StatCard>
            <StatCard title={t("Risque", "Risk")} icon={<path d="M12 3l9 16H3zM12 10v4M12 17v.5" />}>
              <strong>
                {formatNumber(summary.sharpe, 2, locale)}
                <em>Sharpe</em>
              </strong>
              <small>
                {t("Drawdown max", "Max drawdown")} <span className={styles.down}>{pct(summary.maxDrawdown)}</span>
              </small>
            </StatCard>
          </div>

          <ChartCard title={byYear ? t("Rendement par année", "Return by year") : t("Rendement par mois", "Return by month")}>
            <BarChart
              key={`r${mode}${period}`}
              values={groups.map((g) => g.value)}
              labels={groups.map((g) => groupLabel(g.key))}
              tipLabels={groups.map((g) => groupLabel(g.key, true))}
              format={(v) => pct(v)}
              axisFormat={(v) => pct(v, 0)}
              colorOf={(v) => (v >= 0 ? UP : DOWN)}
              gradient
              ariaLabel={byYear ? t("Rendement de chaque année", "Return of each year") : t("Rendement de chaque mois", "Return of each month")}
            />
          </ChartCard>

          <ChartCard title={byYear ? t("Jours positifs par année", "Positive days by year") : t("Jours positifs par mois", "Positive days by month")}>
            <BarChart
              key={`w${mode}${period}`}
              values={groups.map((g) => (g.positive / g.count) * 100)}
              labels={groups.map((g) => groupLabel(g.key))}
              tipLabels={groups.map((g) => `${groupLabel(g.key, true)} · ${g.positive}/${g.count} ${t("jours", "days")}`)}
              format={(v) => plain(v)}
              axisFormat={(v) => plain(v, 0)}
              colorOf={() => BLUE}
              gradient
              ariaLabel={t("Part de jours positifs", "Share of positive days")}
            />
          </ChartCard>

          <ChartCard title={t("Stratégies par marché", "Strategies by market")}>
            {markets.length ? (
              <ul className={styles.hbars}>
                {markets.map(([market, n]) => (
                  <li key={market}>
                    <span className={styles.hbarLabel}>{market}</span>
                    <span className={styles.hbarTrack}>
                      <i style={{ width: `${(n / maxMarket) * 100}%`, background: `linear-gradient(90deg, ${MARKETS}55, ${MARKETS})` }} />
                    </span>
                    <b>{n}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>
                {book.hiddenStrategies
                  ? t("Les stratégies de ce book sont visibles seulement par les membres autorisés.", "This book's strategies are visible only to authorised members.")
                  : t("Pas encore de stratégie dans ce book.", "No strategies in this book yet.")}
              </p>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.card}>
      <h3>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </g>
        </svg>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${styles.card} ${styles.chartCard}`}>
      <h3>{title}</h3>
      <div className={styles.chartCardBody}>{children}</div>
    </section>
  );
}

function Dropdown({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  icon: ReactNode;
}) {
  return (
    <label className={styles.dropdown}>
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </g>
      </svg>
      <span className="visually-hidden">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BookIconPath() {
  return <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11" />;
}
