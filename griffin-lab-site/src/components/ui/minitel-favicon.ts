import { BODY, C, CIGAR, CURVE, GAIN, HAPPY, LOSS_UNTIL, SMOKE, SX, SY, VISOR, VISOR_LIDS, VISOR_PUPILS, curveRects, type Rect } from "./minitel-art";

/**
 * La boucle complète de l'avatar Minitel (voir Minitel.tsx et Minitel.module.css), recalculée
 * image par image pour un favicon de 32 × 32 : chaque pixel de la grille fait 2 × 2 pixels.
 * La grille est recadrée en 16 × 16 (lignes −2 à 13) : l'antenne garde sa base et sa pointe.
 *
 * Un tour : yeux (5,6 s) → courbe → « +3% » → yeux contents qui sautillent, ou un tour sur
 * trois le robot (visière, cigare) → l'écran s'éteint. Les durées reprennent celles du composant.
 */

export const FAVICON_SIZE = 32;
const CELL = 2;
const TOP = 2; // la ligne −2 de la grille est en haut du favicon
const HEIGHT = 16; // hauteur dessinée, en pixels de grille

/** Étapes d'un tour ; `columns` : nombre de colonnes de courbe affichées. */
type Step =
  | { phase: "eyes" | "gain" | "visor" | "off"; ms: number }
  | { phase: "curve"; ms: number; columns: number }
  | { phase: "happy"; ms: number; motion: "" | "hop" | "shake"; since: number };

function turnSteps(robot: boolean): Step[] {
  const steps: Step[] = [{ phase: "eyes", ms: 5600 }];
  for (let i = 1; i <= CURVE.length; i++) steps.push({ phase: "curve", ms: i <= LOSS_UNTIL + 1 ? 170 : 85, columns: i });
  steps.push({ phase: "curve", ms: 450, columns: CURVE.length });
  steps.push({ phase: "gain", ms: 3000 });
  if (robot) {
    steps.push({ phase: "visor", ms: 5600 });
  } else {
    // « since » : début de l'apparition des yeux contents, pour leur fondu sur 300 ms
    let since = 0;
    const happy = (ms: number, motion: "" | "hop" | "shake") => {
      steps.push({ phase: "happy", ms, motion, since });
      since += ms;
    };
    happy(250, "");
    for (let round = 0; round < 2; round++) {
      happy(960, "hop");
      happy(480, "shake");
      happy(60, "");
    }
    happy(700, "");
  }
  steps.push({ phase: "off", ms: 2200 });
  return steps;
}

/** Trois tours : deux normaux, puis le robot (comme le composant : tours 3, 6, 9…). */
const CYCLE = [...turnSteps(false), ...turnSteps(false), ...turnSteps(true)];
const CYCLE_MS = CYCLE.reduce((sum, s) => sum + s.ms, 0);

/** Valeur d'une animation CSS en `steps(1, end)` : la dernière image clé atteinte. */
function stepped<T>(k: number, frames: [at: number, value: T][]): T {
  let value = frames[0][1];
  for (const [at, v] of frames) if (k >= at) value = v;
  return value;
}

/** Interpolation linéaire entre images clés (pour le saut, qui n'est pas en crans). */
function lerp(k: number, frames: [at: number, ...values: number[]][]): number[] {
  for (let i = 1; i < frames.length; i++) {
    const [a, ...va] = frames[i - 1];
    const [b, ...vb] = frames[i];
    if (k <= b) {
      const f = b === a ? 1 : (k - a) / (b - a);
      return va.map((v, j) => v + (vb[j] - v) * f);
    }
  }
  return frames[frames.length - 1].slice(1);
}

// sautille trois fois (écrasé à l'appel et à la réception) : translateY (part de la hauteur), scaleX, scaleY
const HOP: [number, number, number, number][] = [
  [0, 0, 1, 1],
  [0.08, 0, 1.1, 0.86],
  [0.2, -0.34, 0.94, 1.08],
  [0.32, 0, 1.1, 0.88],
  [0.44, -0.26, 0.95, 1.06],
  [0.56, 0, 1.08, 0.9],
  [0.68, -0.16, 0.97, 1.04],
  [0.8, 0, 1.05, 0.94],
  [1, 0, 1, 1],
];

// puis vibre : translateX, translateY (parts de la taille), rotation (degrés)
const SHAKE: [number, [number, number, number]][] = [
  [0, [0, 0, 0]],
  [0.1, [-0.04, 0, -2]],
  [0.3, [0.04, -0.02, 2]],
  [0.5, [-0.04, 0, -2]],
  [0.7, [0.04, -0.02, 2]],
  [0.9, [-0.04, 0, -2]],
];

/**
 * Dessine l'image de l'instant `t` (ms depuis le début) et renvoie une clé qui ne change que
 * lorsque l'image change (pour ne mettre à jour le favicon qu'à ce moment-là).
 */
export function drawMinitelFrame(ctx: CanvasRenderingContext2D, t: number): string {
  // étape courante du cycle
  let rest = t % CYCLE_MS;
  let step = CYCLE[0];
  for (const s of CYCLE) {
    step = s;
    if (rest < s.ms) break;
    rest -= s.ms;
  }
  const k = rest / step.ms;
  const lit = step.phase === "gain" || step.phase === "happy" || step.phase === "visor";

  const rect = (x: number, y: number, w: number, h: number, fill: string, alpha = 1) => {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fillRect(x * CELL, (y + TOP) * CELL, w * CELL, h * CELL);
    ctx.globalAlpha = 1;
  };
  const rects = (list: Rect[], dx = 0, dy = 0, alpha = 1) =>
    list.forEach(([x, y, w, h, fill]) => rect(x + dx, y + dy, w, h, fill, alpha));

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
  let key: string = step.phase;

  // saut et vibration de joie : tout le Minitel bouge, ancré en bas au milieu
  if (step.phase === "happy" && step.motion) {
    const w = FAVICON_SIZE;
    const h = HEIGHT * CELL;
    let tx = 0, ty = 0, sx = 1, sy = 1, rot = 0;
    if (step.motion === "hop") {
      const sampled = Math.round(k * 12) / 12; // une douzaine d'images par saut
      [ty, sx, sy] = lerp(sampled, HOP);
      ty *= h;
      key += sampled;
    } else {
      const [x, y, r] = stepped(k, SHAKE);
      tx = x * w;
      ty = y * h;
      rot = (r * Math.PI) / 180;
      key += `${x},${y}`;
    }
    ctx.translate(w / 2 + tx, h + ty);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    ctx.translate(-w / 2, -h);
  }

  // boîtier, antenne (base et pointe), voyant
  rect(2, -1, 3, 1, C.shade);
  rect(3, -2, 1, 1, lit ? C.ledOn : C.light);
  rects(BODY);
  const ledOn = lit || t % 2400 < 1200; // voyant rouge qui clignote, vert pendant la victoire
  if (ledOn) rect(12, 11, 1, 1, lit ? C.ledOn : C.led);
  key += ledOn;

  // écran : rien ne déborde du cadre
  ctx.save();
  ctx.beginPath();
  ctx.rect(SX * CELL, (SY + TOP) * CELL, 12 * CELL, 8 * CELL);
  ctx.clip();

  switch (step.phase) {
    case "eyes": {
      const alpha = stepped(k, [[0, 0], [0.03, 0.55], [0.05, 1], [0.95, 0.55], [0.98, 0]]);
      const dx = stepped(k, [[0, 0], [0.09, -1], [0.22, 1], [0.35, -1], [0.48, 1], [0.61, 0]]);
      const blink = stepped(k, [[0, false], [0.68, true], [0.7, false], [0.8, true], [0.82, false]]);
      if (blink) {
        // paupières baissées : il ne reste que le bas des yeux
        rect(SX + 2, SY + 4, 3, 1, C.glow, alpha);
        rect(SX + 7, SY + 4, 3, 1, C.glow, alpha);
      } else {
        rect(SX + 2, SY + 2, 3, 3, C.glow, alpha);
        rect(SX + 7, SY + 2, 3, 3, C.glow, alpha);
        rect(SX + 3 + dx, SY + 3, 1, 2, C.screen, alpha);
        rect(SX + 8 + dx, SY + 3, 1, 2, C.screen, alpha);
      }
      key += [alpha, dx, blink].join();
      break;
    }
    case "curve":
      rects(curveRects(step.columns));
      key += step.columns;
      break;
    case "gain": {
      const on = rest % 500 < 250; // clignote six fois
      if (on) rects(GAIN);
      key += on;
      break;
    }
    case "happy": {
      const alpha = stepped(step.since + rest, [[0, 0], [102, 0.6], [201, 1]]);
      rects(HAPPY, 0, 0, alpha);
      key += alpha;
      break;
    }
    case "visor": {
      const visible = k >= 0.03 && k < 0.98;
      if (visible) {
        const dy = stepped(k, [[0, -2], [0.06, -1], [0.09, 0]]);
        const alpha = k >= 0.95 ? 0.55 : 1;
        const dx = stepped(k, [[0, 0], [0.09, -1], [0.22, 1], [0.35, -1], [0.48, 1], [0.61, 0]]);
        const lids = k >= 0.26 && k < 0.89;
        const cigar = k >= 0.19 && k < 0.93;
        rects(VISOR, 0, dy, alpha);
        rects(VISOR_PUPILS, dx, dy, alpha);
        if (lids) rects(VISOR_LIDS, 0, dy, alpha);
        let smoke = "";
        if (cigar) {
          rects(CIGAR, 0, dy, alpha);
          // trois bouffées décalées de 0,4 s, qui montent d'un pixel par cran en s'estompant
          SMOKE.forEach(([x, y, w, h, fill], i) => {
            const s = rest / 1000 - i * 0.4;
            if (s < 0) return;
            const notch = Math.floor(((s % 1.2) / 1.2) * 3);
            rect(x, y + dy - notch, w, h, fill, alpha * (0.9 - 0.3 * notch));
            smoke += notch;
          });
        }
        key += [dy, alpha, dx, lids, cigar, smoke].join();
      } else key += "blank";
      break;
    }
    case "off": {
      // l'écran se réduit à un trait, puis à un point, puis s'éteint (7 crans sur 0,7 s)
      const p = rest / 700;
      if (p < 1) {
        const s = Math.floor(p * 7) / 7;
        const sy = s < 0.4 ? 1 - 0.875 * (s / 0.4) : 0.125;
        const sx = s < 0.4 ? 1 : s < 0.75 ? 1 - 0.9167 * ((s - 0.4) / 0.35) : 0.0833;
        const alpha = s < 0.4 ? 0.85 + 0.15 * (s / 0.4) : s < 0.75 ? 1 : 1 - (s - 0.75) / 0.25;
        const w = Math.max(1, 12 * sx);
        const h = Math.max(1, 8 * sy);
        rect(SX + (12 - w) / 2, SY + (8 - h) / 2, w, h, C.glow, alpha);
        key += s;
      } else key += "dark";
      break;
    }
  }
  ctx.restore();
  return key;
}
