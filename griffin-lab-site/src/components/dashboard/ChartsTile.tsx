"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { intlLocale } from "@/lib/i18n/core";
import { cumulative, drawdowns, histogram, monteCarlo, monthly, rollingSharpe, rollingVolatility, summarize, yearly } from "@/lib/dashboard/metrics";
import { formatNumber, formatPercent } from "@/lib/shared/format";
import { BarChart, LineChart, type Marker } from "./charts";
import styles from "./Dashboard.module.css";
import type { DashDay } from "./types";

const UP = "#22c55e";
const DOWN = "#ef4444";

type ChartKind = "cumulative" | "drawdown" | "montecarlo" | "daily" | "monthly" | "yearly" | "distribution" | "volatility" | "sharpe";

const PERIODS = [
  { days: 30, fr: "1 M", en: "1M" },
  { days: 90, fr: "3 M", en: "3M" },
  { days: 365, fr: "1 A", en: "1Y" },
  { days: 1095, fr: "3 A", en: "3Y" },
  { days: 1826, fr: "5 A", en: "5Y" },
  { days: 3653, fr: "10 A", en: "10Y" },
] as const;
const HORIZONS = [
  { days: 30, fr: "30 j", en: "30d" },
  { days: 90, fr: "90 j", en: "90d" },
  { days: 365, fr: "1 an", en: "1y" },
] as const;

/** Tuile 3 : graphes de rendement au choix (liste), sur la période choisie, backtest compris. */
export function ChartsTile({ days, color, expanded }: { days: DashDay[]; color: string; expanded: boolean }) {
  const t = useT();
  const locale = useLocale();
  const selectId = useId();
  const [kind, setKind] = useState<ChartKind>("cumulative");
  const [period, setPeriod] = useState<number>(3653);
  const [horizon, setHorizon] = useState<number>(365);

  const fmt = intlLocale(locale);
  const pct = (v: number, d = 1) => formatPercent(v, d, true, locale);
  const num = (v: number, d = 2) => formatNumber(v, d, locale);
  const long = period > 365;
  /** Axe : « 12 mars » (période courte) ou « mars 2019 » (plusieurs années). */
  const axisDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(fmt, long ? { month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
  const fullDate = (d: DashDay) =>
    `${new Date(`${d.date}T00:00:00Z`).toLocaleDateString(fmt, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}${d.backtest ? " · backtest" : ""}`;

  const complete = useMemo(() => days.filter((d) => !d.partial), [days]);
  const span = useMemo(() => complete.slice(-period), [complete, period]);
  const values = useMemo(() => span.map((d) => d.value), [span]);
  const summary = useMemo(() => summarize(values), [values]);
  // premier jour simulé en direct dans la période (fin du backtest)
  const liveIndex = span.findIndex((d) => !d.backtest);
  const marker = (offset = 0): Marker | undefined =>
    liveIndex > 0 ? { index: liveIndex + offset, label: t("Début du live", "Live starts") } : undefined;

  const roll = long ? 90 : 30;
  const kinds: { id: ChartKind; label: string; help: string }[] = [
    { id: "cumulative", label: t("Gain cumulé", "Cumulative gain"), help: t("Ce qu'aurait rapporté le book depuis le début de la période.", "What the book would have returned since the start of the period.") },
    { id: "drawdown", label: "Drawdown", help: t("Le recul depuis le plus haut précédent, avant de remonter.", "The fall from the previous high, before recovering.") },
    {
      id: "montecarlo",
      label: "Monte Carlo",
      help: t("1 000 futurs tirés parmi les journées de la période : la bande contient 90 % des cas.", "1,000 futures drawn from the days of the period: the band holds 90% of cases."),
    },
    { id: "daily", label: t("Rendement jour par jour", "Day-by-day return"), help: t("Vert : journée en hausse. Rouge : en baisse.", "Green: up day. Red: down day.") },
    { id: "monthly", label: t("Rendement par mois", "Monthly return"), help: t("Le rendement de chaque mois civil.", "Each calendar month's return.") },
    { id: "yearly", label: t("Rendement par année", "Yearly return"), help: t("Le rendement de chaque année civile.", "Each calendar year's return.") },
    { id: "distribution", label: t("Distribution des journées", "Distribution of days"), help: t("Combien de journées dans chaque tranche de rendement.", "How many days in each return bracket.") },
    {
      id: "volatility",
      label: t("Volatilité glissante", "Rolling volatility"),
      help: t(`L'ampleur des variations sur ${roll} jours, ramenée à l'année.`, `How much the book moves over ${roll} days, annualised.`),
    },
    {
      id: "sharpe",
      label: t("Sharpe glissant", "Rolling Sharpe"),
      help: t(`Rendement par unité de risque sur ${roll} jours, ramené à l'année. Au-dessus de 1, c'est bon.`, `Return per unit of risk over ${roll} days, annualised. Above 1 is good.`),
    },
  ];
  const current = kinds.find((k) => k.id === kind)!;

  const chart = (() => {
    if (values.length < 2) return <p className={styles.empty}>{t("Pas encore assez de jours sur cette période.", "Not enough days in this period yet.")}</p>;
    // courbes cumulées : un point de départ (0) la veille du premier jour
    const axisLabels = [axisDate(span[0].date), ...span.map((d) => axisDate(d.date))];
    const tipLabels = [t("Départ", "Start"), ...span.map(fullDate)];
    switch (kind) {
      case "cumulative":
        return (
          <LineChart
            key={`c${period}`}
            labels={axisLabels}
            tipLabels={tipLabels}
            series={[{ label: t("Gain cumulé", "Cumulative gain"), values: cumulative(values), color, fill: true }]}
            format={(v) => pct(v)}
            axisFormat={(v) => pct(v, 0)}
            marker={marker(1)}
            ariaLabel={t(`Gain cumulé sur la période : ${pct(summary.total)}`, `Cumulative gain over the period: ${pct(summary.total)}`)}
          />
        );
      case "drawdown":
        return (
          <LineChart
            key={`d${period}`}
            labels={axisLabels}
            tipLabels={tipLabels}
            series={[{ label: "Drawdown", values: drawdowns(values), color: DOWN, fill: true }]}
            format={(v) => pct(v)}
            axisFormat={(v) => pct(v, 0)}
            marker={marker(1)}
            ariaLabel={t(`Drawdown maximal sur la période : ${pct(summary.maxDrawdown)}`, `Max drawdown over the period: ${pct(summary.maxDrawdown)}`)}
          />
        );
      case "montecarlo": {
        const mc = monteCarlo(values, horizon);
        if (!mc) return null;
        const labels = Array.from({ length: horizon + 1 }, (_, i) => (i === 0 ? t("Aujourd'hui", "Today") : t(`J+${i}`, `D+${i}`)));
        return (
          <>
            <LineChart
              key={`m${period}-${horizon}`}
              labels={labels}
              bands={[
                { label: t("90 % des cas", "90% of cases"), lo: mc.p5, hi: mc.p95, color, opacity: 0.14 },
                { label: t("50 % des cas", "50% of cases"), lo: mc.p25, hi: mc.p75, color, opacity: 0.22 },
              ]}
              series={[
                ...mc.samples.map((path, i) => ({ label: `s${i}`, values: path, color, width: 1, opacity: 0.18, quiet: true })),
                { label: t("Médiane", "Median"), values: mc.p50, color: "#f7f8f8", width: 2 },
              ]}
              format={(v) => pct(v)}
              axisFormat={(v) => pct(v, 0)}
              ariaLabel={t(
                `Monte Carlo sur ${horizon} jours : médiane ${pct(mc.p50[horizon])}, 90 % des cas entre ${pct(mc.p5[horizon])} et ${pct(mc.p95[horizon])}`,
                `Monte Carlo over ${horizon} days: median ${pct(mc.p50[horizon])}, 90% of cases between ${pct(mc.p5[horizon])} and ${pct(mc.p95[horizon])}`,
              )}
            />
            <p className={styles.chartNote}>
              {t("Médiane", "Median")} <b>{pct(mc.p50[horizon])}</b> · {t("9 cas sur 10 entre", "9 in 10 between")} <b>{pct(mc.p5[horizon])}</b> {t("et", "and")}{" "}
              <b>{pct(mc.p95[horizon])}</b> · {t("positif dans", "positive in")} <b>{formatNumber(mc.positive, 0, locale)} %</b> {t("des cas", "of cases")}
            </p>
          </>
        );
      }
      case "daily":
        return (
          <BarChart
            key={`j${period}`}
            values={values}
            labels={span.map((d) => axisDate(d.date))}
            tipLabels={span.map(fullDate)}
            format={(v) => pct(v, 2)}
            axisFormat={(v) => pct(v, 0)}
            colorOf={(v) => (v >= 0 ? UP : DOWN)}
            marker={marker()}
            ariaLabel={t(`Rendements journaliers : ${formatNumber(summary.positiveShare, 0, locale)} % de jours positifs`, `Daily returns: ${formatNumber(summary.positiveShare, 0, locale)}% positive days`)}
          />
        );
      case "monthly": {
        const months = monthly(span);
        const label = (key: string, full = false) =>
          new Date(`${key}-01T00:00:00Z`).toLocaleDateString(fmt, { month: full ? "long" : "short", year: full ? "numeric" : "2-digit", timeZone: "UTC" });
        return (
          <BarChart
            key={`mo${period}`}
            values={months.map((m) => m.value)}
            labels={months.map((m) => label(m.month))}
            tipLabels={months.map((m) => label(m.month, true))}
            format={(v) => pct(v)}
            axisFormat={(v) => pct(v, 0)}
            colorOf={(v) => (v >= 0 ? UP : DOWN)}
            ariaLabel={t("Rendement de chaque mois", "Return of each month")}
          />
        );
      }
      case "yearly": {
        const years = yearly(span);
        return (
          <BarChart
            key={`y${period}`}
            values={years.map((y) => y.value)}
            labels={years.map((y) => y.year)}
            tipLabels={years.map((y, i) => (i === years.length - 1 ? `${y.year} ${t("(en cours)", "(so far)")}` : i === 0 && span[0].date.slice(5) !== "01-01" ? `${y.year} ${t("(partiel)", "(partial)")}` : y.year))}
            format={(v) => pct(v)}
            axisFormat={(v) => pct(v, 0)}
            colorOf={(v) => (v >= 0 ? UP : DOWN)}
            ariaLabel={t("Rendement de chaque année", "Return of each year")}
          />
        );
      }
      case "distribution": {
        const bins = histogram(values, expanded ? 31 : 21);
        return (
          <>
            <BarChart
              key={`h${period}`}
              values={bins.map((b) => b.count)}
              labels={bins.map((b) => pct((b.from + b.to) / 2, 1))}
              tipLabels={bins.map((b) => `${pct(b.from, 2)} → ${pct(b.to, 2)}`)}
              format={(v) => `${formatNumber(v, 0, locale)} ${v > 1 ? t("jours", "days") : t("jour", "day")}`}
              axisFormat={(v) => formatNumber(v, 0, locale)}
              colorOf={(_, i) => ((bins[i].from + bins[i].to) / 2 >= 0 ? UP : DOWN)}
              ariaLabel={t("Distribution des rendements journaliers", "Distribution of daily returns")}
            />
            <p className={styles.chartNote}>
              {formatNumber(summary.positiveShare, 0, locale)} % {t("de jours positifs", "positive days")} · {t("moyenne", "average")} <b>{pct(summary.average, 2)}</b> ·{" "}
              {t("meilleur", "best")} <b>{pct(summary.best, 2)}</b> · {t("pire", "worst")} <b>{pct(summary.worst, 2)}</b>
            </p>
          </>
        );
      }
      case "volatility":
      case "sharpe": {
        // un peu de recul en plus, pour que la courbe commence dès le début de la période
        const ext = complete.slice(-(period + roll - 1)).map((d) => d.value);
        const rolled = (kind === "volatility" ? rollingVolatility(ext, roll) : rollingSharpe(ext, roll)).slice(-values.length);
        return (
          <LineChart
            key={`${kind}${period}`}
            labels={span.map((d) => axisDate(d.date))}
            tipLabels={span.map(fullDate)}
            series={[
              {
                label: kind === "volatility" ? t(`Volatilité ${roll} j`, `${roll}-day volatility`) : t(`Sharpe ${roll} j`, `${roll}-day Sharpe`),
                values: rolled,
                color: kind === "volatility" ? "#f5b524" : color,
              },
            ]}
            format={(v) => (kind === "volatility" ? formatPercent(v, 1, false, locale) : num(v))}
            axisFormat={(v) => (kind === "volatility" ? formatPercent(v, 0, false, locale) : num(v, 1))}
            marker={marker()}
            ariaLabel={current.label}
          />
        );
      }
    }
  })();

  return (
    <div className={styles.charts}>
      <div className={styles.chartBar}>
        <label className={styles.select} htmlFor={selectId}>
          <span className="visually-hidden">{t("Graphe", "Chart")}</span>
          <select id={selectId} value={kind} onChange={(event) => setKind(event.target.value as ChartKind)}>
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </label>
        <div className={styles.segments}>
          {kind === "montecarlo" && (
            <div className={styles.segment} role="group" aria-label={t("Horizon", "Horizon")}>
              {HORIZONS.map((h) => (
                <button key={h.days} type="button" aria-pressed={horizon === h.days} onClick={() => setHorizon(h.days)}>
                  {locale === "en" ? h.en : h.fr}
                </button>
              ))}
            </div>
          )}
          <div className={styles.segment} role="group" aria-label={t("Période", "Period")}>
            {PERIODS.map((p) => (
              <button key={p.days} type="button" aria-pressed={period === p.days} onClick={() => setPeriod(p.days)} disabled={p.days > 30 && complete.length < p.days * 0.5}>
                {locale === "en" ? p.en : p.fr}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className={styles.help}>
        {current.help}
        {kind === "montecarlo" && ` ${t("D'après", "Based on")} ${PERIODS.find((p) => p.days === period)?.[locale === "en" ? "en" : "fr"]}.`}
      </p>
      <div className={styles.chartArea}>{chart}</div>
    </div>
  );
}
