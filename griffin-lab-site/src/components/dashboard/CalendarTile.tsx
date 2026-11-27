"use client";

import { useMemo, useState } from "react";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { intlLocale } from "@/lib/i18n/core";
import { formatPercent } from "@/lib/shared/format";
import styles from "./Dashboard.module.css";
import type { DashDay } from "./types";

const compound = (list: DashDay[]) => (list.reduce((eq, d) => eq * (1 + d.value / 100), 1) - 1) * 100;

/**
 * Calendrier du book : le mois en grille (une case par jour, verte ou rouge selon
 * le rendement) et, à droite, le rendement composé de chaque semaine.
 */
export function CalendarTile({ days }: { days: DashDay[] }) {
  const t = useT();
  const locale = useLocale();
  const fmt = intlLocale(locale);
  const pct = (v: number, d = 1) => formatPercent(Math.abs(v) < 0.005 ? 0 : v, d, true, locale);
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const months = useMemo(() => [...new Set(days.map((d) => d.date.slice(0, 7)))].sort(), [days]);
  const last = months.length - 1;
  const [index, setIndex] = useState(last);
  const current = Math.max(0, Math.min(last, index));
  const month = months[current];

  if (!month) return <p className={styles.empty}>{t("Pas encore de journées pour ce book.", "No days for this book yet.")}</p>;

  const [year, mon] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const length = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // semaine du lundi au dimanche
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(fmt, { weekday: "short", timeZone: "UTC" }).replace(".", ""),
  );
  const longDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(fmt, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  const inMonth = days.filter((d) => d.date.startsWith(month));
  const total = compound(inMonth);
  const positive = inMonth.filter((d) => !d.partial && d.value > 0).length;
  const complete = inMonth.filter((d) => !d.partial).length;

  return (
    <div className={styles.cal}>
      <div className={styles.calHead}>
        <div className={styles.calNav}>
          <button type="button" onClick={() => setIndex(current - 1)} disabled={current <= 0} aria-label={t("Mois précédent", "Previous month")}>
            ‹
          </button>
          <label className={styles.calMonth}>
            <span className="visually-hidden">{t("Mois", "Month")}</span>
            <select value={month} onChange={(event) => setIndex(months.indexOf(event.target.value))}>
              {[...months].reverse().map((m) => (
                <option key={m} value={m}>
                  {new Date(`${m}-01T00:00:00Z`).toLocaleDateString(fmt, { month: "long", year: "numeric", timeZone: "UTC" })}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setIndex(current + 1)} disabled={current >= last} aria-label={t("Mois suivant", "Next month")}>
            ›
          </button>
          <button type="button" className={styles.calNow} onClick={() => setIndex(last)} disabled={current === last}>
            {t("Ce mois-ci", "This month")}
          </button>
        </div>
        <div className={styles.calStats}>
          {inMonth.length > 0 && inMonth.every((d) => d.backtest) && <span className={styles.tag}>Backtest</span>}
          <span>{t("Stats du mois :", "Monthly stats:")}</span>
          <b className={total >= 0 ? styles.calChipUp : styles.calChipDown}>{pct(total)}</b>
          <b className={styles.calChip}>
            {positive}/{complete} {t("jours +", "win days")}
          </b>
        </div>
      </div>

      <div
        className={styles.calGrid}
        style={{ gridTemplateRows: `auto repeat(${weeks.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label={t("Rendements du mois", "Returns for the month")}
      >
        {weekdays.map((w) => (
          <span key={w} className={styles.calWeekday}>
            {w}
          </span>
        ))}
        <span className={styles.calWeekdayBlank} aria-hidden="true" />

        {weeks.map((week, w) => {
          const list = week.flatMap((date) => {
            const day = date ? byDate.get(date) : undefined;
            return day ? [day] : [];
          });
          const weekTotal = compound(list);
          return [
            ...week.map((date, i) => {
              if (!date) return <span key={`${w}-${i}`} className={styles.calBlank} aria-hidden="true" />;
              const day = byDate.get(date);
              const tone = !day ? "" : day.value >= 0 ? styles.calUp : styles.calDown;
              const label = `${longDate(date)} : ${day ? pct(day.value, 2) + (day.partial ? t(" (en cours)", " (in progress)") : "") : t("pas de donnée", "no data")}`;
              return (
                <span key={date} className={`${styles.calDay} ${tone} ${day?.partial ? styles.calPartial : ""}`} title={label} aria-label={label} role="img">
                  <i>{Number(date.slice(8))}</i>
                  {day && (
                    <>
                      <b>{pct(day.value, 2)}</b>
                      <small>{day.partial ? t("en cours", "in progress") : day.backtest ? "backtest" : "live"}</small>
                    </>
                  )}
                </span>
              );
            }),
            <span key={`w${w}`} className={styles.calWeek}>
              <small>
                {t("Semaine", "Week")} {w + 1}
              </small>
              <b className={!list.length ? undefined : weekTotal >= 0 ? styles.up : styles.down}>{list.length ? pct(weekTotal) : "—"}</b>
              <em>
                {list.length} {list.length > 1 ? t("jours", "days") : t("jour", "day")}
              </em>
            </span>,
          ];
        })}
      </div>
    </div>
  );
}
