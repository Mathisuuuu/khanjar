"use client";

import { useMemo, useState } from "react";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { intlLocale } from "@/lib/i18n/core";
import { formatNumber, formatPercent } from "@/lib/shared/format";
import styles from "./Dashboard.module.css";
import type { DashDay } from "./types";

/** Au-delà de ±3 % sur une journée, la case a sa couleur la plus intense. */
const SCALE = 3;

const cellColor = (value: number) => {
  const strength = 0.16 + 0.64 * Math.min(1, Math.abs(value) / SCALE);
  return value >= 0 ? `rgba(34, 197, 94, ${strength.toFixed(3)})` : `rgba(239, 68, 68, ${strength.toFixed(3)})`;
};

/** Tuile 1 : le mois en grille, une case par jour, colorée selon le rendement du book. */
export function CalendarTile({ days }: { days: DashDay[] }) {
  const t = useT();
  const locale = useLocale();
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const months = useMemo(() => [...new Set(days.map((d) => d.date.slice(0, 7)))], [days]);
  const [index, setIndex] = useState(months.length - 1);
  const [picked, setPicked] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const month = months[Math.max(0, Math.min(months.length - 1, index))];

  if (!month) return <p className={styles.empty}>{t("Pas encore de journées pour ce book.", "No days for this book yet.")}</p>;

  const [year, mon] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const length = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // semaine du lundi au dimanche
  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  const fmt = intlLocale(locale);
  const monthName = first.toLocaleDateString(fmt, { month: "long", year: "numeric", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(fmt, { weekday: "narrow", timeZone: "UTC" }),
  );
  const longDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(fmt, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  const inMonth = days.filter((d) => d.date.startsWith(month));
  const complete = inMonth.filter((d) => !d.partial);
  const total = (inMonth.reduce((acc, d) => acc * (1 + d.value / 100), 1) - 1) * 100;
  const positive = complete.filter((d) => d.value > 0).length;
  const best = complete.length ? complete.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const worst = complete.length ? complete.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  const pct = (v: number, d = 2) => formatPercent(v, d, true, locale);
  // « +0,8 » / « −1,2 » ; un rendement qui s'arrondit à 0 s'affiche « 0,0 » (jamais « −0,0 »)
  const dayText = (v: number) => (Math.abs(v) < 0.05 ? formatNumber(0, 1, locale) : formatNumber(v, 1, locale).replace(/^(?=\d)/, "+"));
  const focus = hovered ?? picked;
  const pick = focus ? byDate.get(focus) : undefined;

  const go = (delta: number) => {
    setIndex((i) => Math.max(0, Math.min(months.length - 1, i + delta)));
    setPicked(null);
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.monthBar}>
        <button type="button" className={styles.navButton} onClick={() => go(-1)} disabled={index <= 0} aria-label={t("Mois précédent", "Previous month")}>
          ‹
        </button>
        <label className={styles.monthSelect}>
          <span className="visually-hidden">{t("Mois", "Month")}</span>
          <select
            value={month}
            onChange={(event) => {
              setIndex(months.indexOf(event.target.value));
              setPicked(null);
            }}
          >
            {[...months].reverse().map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}-01T00:00:00Z`).toLocaleDateString(fmt, { month: "long", year: "numeric", timeZone: "UTC" })}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => go(1)}
          disabled={index >= months.length - 1}
          aria-label={t("Mois suivant", "Next month")}
        >
          ›
        </button>
        {inMonth.length > 0 && inMonth.every((d) => d.backtest) && <span className={styles.tag}>Backtest</span>}
        <span className={`${styles.monthTotal} ${total >= 0 ? styles.up : styles.down}`} title={t("Rendement du mois", "Month return")}>
          {pct(total, 1)}
        </span>
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {weekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className={styles.days} role="group" onMouseLeave={() => setHovered(null)} aria-label={t(`Rendements de ${monthName}`, `Returns for ${monthName}`)}>
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} className={styles.blank} aria-hidden="true" />;
          const day = byDate.get(date);
          const label = `${longDate(date)} : ${day ? pct(day.value) + (day.partial ? t(" (en cours)", " (in progress)") : "") : t("pas de donnée", "no data")}`;
          return (
            <button
              key={date}
              type="button"
              className={`${styles.day} ${day ? "" : styles.noData} ${day?.partial ? styles.partial : ""} ${picked === date ? styles.picked : ""}`}
              style={day ? { background: cellColor(day.value) } : undefined}
              onClick={() => setPicked(picked === date ? null : date)}
              onMouseEnter={() => setHovered(date)}
              onFocus={() => setHovered(date)}
              onBlur={() => setHovered(null)}
              aria-label={label}
              aria-pressed={picked === date}
              disabled={!day}
            >
              <span className={styles.dayNumber}>{Number(date.slice(8))}</span>
              {day && <span className={styles.dayValue}>{dayText(day.value)}</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.calendarFoot}>
        {pick ? (
          <p className={styles.dayDetail}>
            <b>{longDate(pick.date)}</b>
            <span className={pick.value >= 0 ? styles.up : styles.down}>{pct(pick.value)}</span>
            {pick.partial && <small>{t("journée en cours", "day in progress")}</small>}
          </p>
        ) : (
          <p className={styles.monthStats}>
            <span>
              <b>{positive}</b> / {complete.length} {t("jours positifs", "positive days")}
            </span>
            {best && (
              <span>
                {t("Meilleur", "Best")} <b className={styles.up}>{pct(best.value)}</b>
              </span>
            )}
            {worst && (
              <span>
                {t("Pire", "Worst")} <b className={worst.value >= 0 ? styles.up : styles.down}>{pct(worst.value)}</b>
              </span>
            )}
          </p>
        )}
        <div className={styles.legend} aria-hidden="true">
          <span>{pct(-SCALE, 0)}</span>
          <i />
          <span>{pct(SCALE, 0)}</span>
        </div>
      </div>
    </div>
  );
}
