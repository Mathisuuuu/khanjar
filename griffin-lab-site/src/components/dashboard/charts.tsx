"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import styles from "./Dashboard.module.css";

/** Petits graphes SVG du dashboard (courbes, aires, barres), avec infobulle au survol et au clavier. */

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = box.getBoundingClientRect();
      const w = Math.round(width);
      const h = Math.round(height);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

/** Graduations « rondes » entre min et max. */
function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.001; v += step) ticks.push(Number(v.toFixed(10)));
  if (ticks[ticks.length - 1] < max) ticks.push(Number((ticks[ticks.length - 1] + step).toFixed(10)));
  return ticks;
}

const PAD = { top: 12, right: 14, bottom: 26, left: 54 };

type Frame = {
  w: number;
  h: number;
  x: (i: number) => number;
  y: (v: number) => number;
  ticks: number[];
};

function frame(w: number, h: number, count: number, values: number[], band = false): Frame {
  let min = Math.min(0, ...values);
  let max = Math.max(0, ...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  const ticks = niceTicks(min, max);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const innerW = Math.max(1, w - PAD.left - PAD.right);
  const innerH = Math.max(1, h - PAD.top - PAD.bottom);
  // barres : chaque valeur occupe une case ; courbes : du premier au dernier bord
  const x = band
    ? (i: number) => PAD.left + ((i + 0.5) / Math.max(1, count)) * innerW
    : (i: number) => PAD.left + (count <= 1 ? innerW / 2 : (i / (count - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * innerH;
  return { w, h, x, y, ticks };
}

function Axes({ f, format, labels, count, band }: { f: Frame; format: (v: number) => string; labels: string[]; count: number; band?: boolean }) {
  // 2 à 6 dates réparties sur l'axe horizontal selon la largeur
  const slots = Math.max(2, Math.min(6, Math.floor((f.w - PAD.left) / 110)));
  const marks = count <= 1 ? [0] : [...new Set(Array.from({ length: slots }, (_, k) => Math.round((k / (slots - 1)) * (count - 1))))];
  return (
    <g className={styles.axes} aria-hidden="true">
      {f.ticks.map((tick) => (
        <g key={tick}>
          <line x1={PAD.left} x2={f.w - PAD.right} y1={f.y(tick)} y2={f.y(tick)} className={tick === 0 ? styles.zero : styles.gridLine} />
          <text x={PAD.left - 8} y={f.y(tick) + 4} textAnchor="end">
            {format(tick)}
          </text>
        </g>
      ))}
      {marks.map((i, k) => (
        <text
          key={i}
          x={f.x(i)}
          y={f.h - 6}
          textAnchor={band ? "middle" : k === 0 ? "start" : k === marks.length - 1 ? "end" : "middle"}
        >
          {labels[i]}
        </text>
      ))}
    </g>
  );
}

/** Trait vertical : la fin du backtest et le début de la simulation en direct. */
export type Marker = { index: number; label: string };

function MarkerLine({ f, marker }: { f: Frame; marker?: Marker }) {
  if (!marker) return null;
  const x = f.x(marker.index);
  const right = x > f.w - 120;
  return (
    <g className={styles.marker} aria-hidden="true">
      <line x1={x} x2={x} y1={PAD.top} y2={f.h - PAD.bottom} />
      <text x={right ? x - 6 : x + 6} y={PAD.top + 10} textAnchor={right ? "end" : "start"}>
        {marker.label}
      </text>
    </g>
  );
}

function pathOf(values: (number | null)[], f: Frame): string {
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${f.x(i).toFixed(1)},${f.y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

export type Series = {
  label: string;
  values: (number | null)[];
  color: string;
  /** Aire jusqu'à la ligne du zéro. */
  fill?: boolean;
  width?: number;
  opacity?: number;
  /** Absente de l'infobulle (trajectoires d'illustration). */
  quiet?: boolean;
};
export type Band = { label: string; lo: number[]; hi: number[]; color: string; opacity: number };

type Tip = { index: number; left: number; top: number } | null;

function Tooltip({ tip, width, children }: { tip: NonNullable<Tip>; width: number; children: ReactNode }) {
  const flip = tip.left > width - 200;
  return (
    <div
      className={styles.chartTip}
      style={{ left: tip.left, top: tip.top, transform: flip ? "translate(calc(-100% - 12px), 0)" : "translate(12px, 0)" }}
      role="status"
    >
      {children}
    </div>
  );
}

/** Survol à la souris, ou au clavier : flèches gauche / droite, Début, Fin, Échap. */
function useHover(count: number, xOf: (i: number) => number, yTop: number) {
  const [tip, setTip] = useState<Tip>(null);
  const move = (index: number) => setTip({ index, left: xOf(index), top: yTop });
  const onKeyDown = (event: KeyboardEvent) => {
    if (!count) return;
    if (event.key === "Escape") return setTip(null);
    const current = tip?.index ?? count;
    const next =
      event.key === "ArrowLeft"
        ? current - 1
        : event.key === "ArrowRight"
          ? Math.min(count - 1, current + 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    move(Math.max(0, Math.min(count - 1, next)));
  };
  return { tip, setTip, move, onKeyDown };
}

export function LineChart({
  series,
  bands = [],
  labels,
  tipLabels = labels,
  format,
  axisFormat = format,
  ariaLabel,
  marker,
}: {
  series: Series[];
  bands?: Band[];
  labels: string[];
  tipLabels?: string[];
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  ariaLabel: string;
  marker?: Marker;
}) {
  const { ref, size } = useSize<HTMLDivElement>();
  const count = labels.length;
  const all = [
    ...series.flatMap((s) => s.values.filter((v): v is number => v !== null && Number.isFinite(v))),
    ...bands.flatMap((b) => [...b.lo, ...b.hi]),
  ];
  const f = frame(size.w, size.h, count, all);
  const { tip, setTip, move, onKeyDown } = useHover(count, f.x, PAD.top);

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left - PAD.left) / Math.max(1, size.w - PAD.left - PAD.right);
    move(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))));
  };
  const shown = (s: Series, i: number) => !s.quiet && s.values[i] !== null && s.values[i] !== undefined;

  return (
    <div className={styles.chart} ref={ref}>
      {size.w > 0 && size.h > 0 && (
        <svg
          width={size.w}
          height={size.h}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setTip(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setTip(null)}
        >
          <Axes f={f} format={axisFormat} labels={labels} count={count} />
          <MarkerLine f={f} marker={marker} />
          {bands.map((b) => (
            <path
              key={b.label}
              d={`${pathOf(b.hi, f)}${b.lo
                .map((v, i) => [v, i] as const)
                .reverse()
                .map(([v, i]) => `L${f.x(i).toFixed(1)},${f.y(v).toFixed(1)}`)
                .join("")}Z`}
              fill={b.color}
              opacity={b.opacity}
            />
          ))}
          {series.map((s) =>
            s.fill ? (
              <path
                key={`${s.label}-fill`}
                d={`${pathOf(s.values, f)}L${f.x(count - 1).toFixed(1)},${f.y(0).toFixed(1)}L${f.x(0).toFixed(1)},${f.y(0).toFixed(1)}Z`}
                fill={s.color}
                opacity={0.14}
              />
            ) : null,
          )}
          {series.map((s) => (
            <path
              key={s.label}
              d={pathOf(s.values, f)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width ?? 2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={s.opacity ?? 1}
            />
          ))}
          {tip && (
            <g aria-hidden="true">
              <line x1={f.x(tip.index)} x2={f.x(tip.index)} y1={PAD.top} y2={size.h - PAD.bottom} className={styles.crosshair} />
              {series
                .filter((s) => shown(s, tip.index))
                .map((s) => (
                  <circle key={s.label} cx={f.x(tip.index)} cy={f.y(s.values[tip.index]!)} r={4.5} fill={s.color} className={styles.dot} />
                ))}
            </g>
          )}
        </svg>
      )}
      {tip && (
        <Tooltip tip={tip} width={size.w}>
          <b>{tipLabels[tip.index]}</b>
          {bands.map((b) => (
            <span key={b.label}>
              {b.label}{" "}
              <em>
                {format(b.lo[tip.index])} → {format(b.hi[tip.index])}
              </em>
            </span>
          ))}
          {series
            .filter((s) => shown(s, tip.index))
            .map((s) => (
              <span key={s.label}>
                <i style={{ background: s.color }} aria-hidden="true" />
                {s.label} <em>{format(s.values[tip.index]!)}</em>
              </span>
            ))}
        </Tooltip>
      )}
    </div>
  );
}

export function BarChart({
  values,
  labels,
  tipLabels = labels,
  format,
  axisFormat = format,
  colorOf,
  ariaLabel,
  marker,
}: {
  values: number[];
  labels: string[];
  tipLabels?: string[];
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  colorOf: (v: number, i: number) => string;
  ariaLabel: string;
  marker?: Marker;
}) {
  const { ref, size } = useSize<HTMLDivElement>();
  const count = values.length;
  const f = frame(size.w, size.h, count, values, true);
  const { tip, setTip, move, onKeyDown } = useHover(count, f.x, PAD.top);
  const slot = Math.max(1, (size.w - PAD.left - PAD.right) / Math.max(1, count));
  // 2 px d'écart entre les barres (1 px quand elles sont très fines)
  const barW = Math.max(1, slot - (slot > 6 ? 2 : slot > 3 ? 1 : 0));

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - box.left - PAD.left) / slot);
    if (index >= 0 && index < count) move(index);
  };

  return (
    <div className={styles.chart} ref={ref}>
      {size.w > 0 && size.h > 0 && (
        <svg
          width={size.w}
          height={size.h}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setTip(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setTip(null)}
        >
          <Axes f={f} format={axisFormat} labels={labels} count={count} band />
          <MarkerLine f={f} marker={marker} />
          {values.map((v, i) => {
            const top = Math.min(f.y(v), f.y(0));
            const height = Math.max(v === 0 ? 0 : 1, Math.abs(f.y(v) - f.y(0)));
            return (
              <rect
                key={i}
                x={f.x(i) - barW / 2}
                y={top}
                width={barW}
                height={height}
                rx={Math.min(3, barW / 2)}
                fill={colorOf(v, i)}
                opacity={tip && tip.index !== i ? 0.5 : 1}
              />
            );
          })}
        </svg>
      )}
      {tip && (
        <Tooltip tip={tip} width={size.w}>
          <b>{tipLabels[tip.index]}</b>
          <span>
            <em>{format(values[tip.index])}</em>
          </span>
        </Tooltip>
      )}
    </div>
  );
}
