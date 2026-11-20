import { useId } from "react";
import { simulatedSeries } from "@/lib/random";

type SparklineProps = {
  /** Rendement cumulé en % (un point par heure). Sans lui, courbe de secours tirée de `seed` et `drift`. */
  points?: number[];
  seed: number;
  drift: number;
  className?: string;
  label?: string;
};

const W = 200;
const H = 44;
const GAIN = "#22C55E";
const LOSS = "#EF4444";

/**
 * Mini-courbe de rendement, rendue en SVG côté serveur. La ligne pointillée
 * marque 0 % (début de la semaine) : au-dessus, la courbe est verte ; dès
 * qu'elle passe en perte, elle devient rouge (deux tracés découpés à la ligne 0).
 * `preserveAspectRatio="none"` l'étire sur la largeur disponible ;
 * `vector-effect` garde un trait de 1,6 px quelle que soit la taille.
 */
export function Sparkline({ points, seed, drift, className, label }: SparklineProps) {
  const id = useId().replace(/:/g, "");
  const series =
    points && points.length > 1
      ? points
      : (() => {
          const raw = simulatedSeries(seed, drift);
          return raw.map((v) => (v / raw[0] - 1) * 100);
        })();

  const min = Math.min(0, ...series);
  const max = Math.max(0, ...series);
  const x = (i: number) => (i / (series.length - 1)) * (W - 4);
  const y = (v: number) => H - 3 - ((v - min) / (max - min || 1)) * (H - 8);
  const zeroY = y(0);

  const line = series.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join("");
  const lastX = x(series.length - 1);
  const last = series[series.length - 1];
  const lastY = y(last);
  // surface entre la courbe et la ligne 0
  const area = `${line}L${lastX.toFixed(2)} ${zeroY.toFixed(2)}L0 ${zeroY.toFixed(2)}Z`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <clipPath id={`${id}-gain`}>
          <rect x="0" y="0" width={W} height={zeroY} />
        </clipPath>
        <clipPath id={`${id}-loss`}>
          <rect x="0" y={zeroY} width={W} height={H - zeroY} />
        </clipPath>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(34,197,94,.32)" />
          <stop offset="1" stopColor="rgba(34,197,94,0)" />
        </linearGradient>
        <linearGradient id={`${id}-l`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="rgba(239,68,68,.34)" />
          <stop offset="1" stopColor="rgba(239,68,68,0)" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${id}-g)`} clipPath={`url(#${id}-gain)`} />
      <path d={area} fill={`url(#${id}-l)`} clipPath={`url(#${id}-loss)`} />
      <path
        d={`M0 ${zeroY}H${W}`}
        stroke="rgba(255,255,255,.18)"
        strokeWidth="1"
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      {[
        { color: GAIN, clip: `${id}-gain` },
        { color: LOSS, clip: `${id}-loss` },
      ].map((part) => (
        <path
          key={part.clip}
          d={line}
          fill="none"
          stroke={part.color}
          strokeWidth="1.6"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          clipPath={`url(#${part.clip})`}
        />
      ))}
      {/* point final : segment nul à bout rond, reste circulaire malgré l'étirement */}
      <path
        d={`M${lastX} ${lastY}h0`}
        stroke={last >= 0 ? "#4ADE80" : "#F87171"}
        strokeWidth="5.2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
