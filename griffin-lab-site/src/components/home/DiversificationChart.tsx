"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./Diversification.module.css";

export type ChartSeries = { count: number; color: string; values: number[] };

type Props = {
  title: string;
  series: ChartSeries[];
  years: number;
  /** pas des graduations, en points de % */
  tick: number;
};

const PAD = { top: 10, right: 12, bottom: 26, left: 44 };

const pct = (value: number, digits = 0) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;

/**
 * Courbes d'une métrique (rendement cumulé ou drawdown) pour 2, 5 et 10
 * stratégies. Un seul axe ; au survol, un réticule et une bulle donnent la
 * valeur des trois courbes à la même date.
 */
export function DiversificationChart({ title, series, years, tick }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = box.getBoundingClientRect();
      setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const n = series[0].values.length;
  const all = series.flatMap((s) => s.values);
  // l'axe colle aux données (petite marge) ; graduations aux multiples de `tick` dans cet intervalle
  const minV = Math.min(0, ...all);
  const maxV = Math.max(0, ...all);
  const margin = (maxV - minV) * 0.06;
  const lo = minV - (minV < 0 ? margin : 0);
  const hi = maxV + (maxV > 0 ? margin : 0);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / tick) * tick; v <= hi + 1e-9; v += tick) ticks.push(v);

  const innerW = Math.max(0, size.w - PAD.left - PAD.right);
  const innerH = Math.max(0, size.h - PAD.top - PAD.bottom);
  const x = (i: number) => PAD.left + (i / (n - 1)) * innerW;
  const y = (v: number) => PAD.top + ((hi - v) / (hi - lo || 1)) * innerH;
  const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!innerW) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left - PAD.left) / innerW;
    setHover(Math.round(Math.min(1, Math.max(0, ratio)) * (n - 1)));
  };

  const yearTicks = Array.from({ length: Math.floor(years) + 1 }, (_, i) => i);
  const sorted = hover === null ? [] : [...series].sort((a, b) => b.values[hover] - a.values[hover]);
  const tipLeft = hover === null ? 0 : x(hover);

  return (
    <figure className={styles.chart}>
      <figcaption>
        <b>{title}</b>
      </figcaption>
      <div
        ref={boxRef}
        className={styles.plot}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {size.w > 0 && (
          <svg width={size.w} height={size.h} aria-hidden="true">
            {ticks.map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={size.w - PAD.right}
                  y1={y(v)}
                  y2={y(v)}
                  className={v === 0 ? styles.zero : styles.grid}
                />
                <text x={PAD.left - 8} y={y(v)} className={styles.axis} textAnchor="end" dominantBaseline="middle">
                  {pct(v)}
                </text>
              </g>
            ))}
            {yearTicks.map((year) => (
              <text
                key={year}
                x={x(Math.min(n - 1, Math.round((year / years) * (n - 1))))}
                y={size.h - 6}
                className={styles.axis}
                textAnchor={year === 0 ? "start" : year === yearTicks.length - 1 ? "end" : "middle"}
              >
                {year === 0 ? "Départ" : `${year} an${year > 1 ? "s" : ""}`}
              </text>
            ))}
            {series.map((s) => (
              <path
                key={s.count}
                d={path(s.values)}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {hover !== null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className={styles.cross} />
                {series.map((s) => (
                  <circle
                    key={s.count}
                    cx={x(hover)}
                    cy={y(s.values[hover])}
                    r="4.5"
                    fill={s.color}
                    stroke="var(--bg)"
                    strokeWidth="2"
                  />
                ))}
              </>
            )}
          </svg>
        )}
        {hover !== null && (
          <div
            className={styles.tooltip}
            style={{
              left: tipLeft,
              transform: `translateX(${tipLeft > size.w * 0.6 ? "calc(-100% - 12px)" : "12px"})`,
            }}
          >
            <span className={styles.tipDate}>
              {hover === 0 ? "Départ" : `Semaine ${hover}`}
            </span>
            {sorted.map((s) => (
              <span key={s.count} className={styles.tipRow}>
                <i style={{ background: s.color }} />
                {s.count} stratégies <b>{pct(s.values[hover], 1)}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
}
