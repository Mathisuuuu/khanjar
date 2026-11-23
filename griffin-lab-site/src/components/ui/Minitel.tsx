"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Minitel.module.css";
import { ANTENNA, BODY, C, CIGAR, CURVE, GAIN, HAPPY, LOSS_UNTIL, SMOKE, SX, SY, VISOR, VISOR_LIDS, VISOR_PUPILS, curveRects, type Rect } from "./minitel-art";

/**
 * Avatar de Fleija : l'écran d'un vieil ordinateur façon Minitel avec son antenne, en pixel art
 * (grille 16 × 18 : antenne sur les lignes −4 à −1, boîtier de 0 à 13).
 * Boucle (mode `auto`) : les yeux regardent à gauche puis à droite (deux fois) ; la courbe perd
 * un peu puis gagne beaucoup ; « +3% » clignote en vert ; des yeux contents apparaissent et
 * l'écran sautille de joie (deux séries) ; puis l'écran s'éteint comme un vieux téléviseur.
 * Un tour sur trois, les yeux contents laissent la place à un clin d'œil aux robots de dessin
 * animé : une visière aux paupières mi-closes qui regarde de côté, et un cigare qui fume.
 * Sans `auto`, l'écran affiche seulement le curseur « _ » qui clignote.
 * Rien ne bouge si le système demande moins d'animations (prefers-reduced-motion).
 */

/** Attend `ms` ; `false` si le composant a disparu entre-temps. */
const sleep = (ms: number, alive: { current: boolean }) =>
  new Promise<boolean>((resolve) => setTimeout(() => resolve(alive.current), ms));

const draw = (rects: Rect[]) =>
  rects.map(([x, y, w, h, fill], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />);

type Phase = "idle" | "eyes" | "curve" | "gain" | "happy" | "visor" | "off";

type Props = {
  /** Largeur en pixels (hauteur : 18/16 de la largeur, antenne comprise). */
  width?: number;
  /** Joue la boucle ; sinon l'écran affiche seulement le curseur « _ » qui clignote. */
  auto?: boolean;
  /**
   * À côté d'un texte (logo) : centre le boîtier, et non le dessin antenne comprise, sur la ligne.
   * L'antenne dépasse alors au-dessus.
   */
  inline?: boolean;
  className?: string;
};

export function Minitel({ width = 18, auto = false, inline = false, className }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [columns, setColumns] = useState(0);
  const [motion, setMotion] = useState<"" | "hop" | "shake">("");
  const alive = useRef(true);

  /**
   * Un tour de boucle : yeux → courbe → +3% → yeux contents (ou, un tour sur trois, le robot) → écran éteint.
   * `false` si la boucle a été arrêtée ou le composant retiré en cours de route.
   */
  const cycle = useCallback(async (turn: number, isStopped: () => boolean) => {
    const step = async (ms: number) => (await sleep(ms, alive)) && !isStopped();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. les yeux : gauche, droite, gauche, droite (voir Minitel.module.css)
    setPhase("eyes");
    if (!(await step(5600))) return false;

    // 2. la courbe : la baisse traîne, la hausse file
    setPhase("curve");
    for (let i = 1; i <= CURVE.length; i++) {
      setColumns(i);
      if (!(await step(reduced ? 0 : i <= LOSS_UNTIL + 1 ? 170 : 85))) return false;
    }
    if (!(await step(450))) return false;

    // 3. « +3% » qui clignote (six fois)
    setPhase("gain");
    setColumns(0);
    if (!(await step(3000))) return false;

    // 4. un tour sur trois : le robot (visière, cigare) ; sinon yeux contents, il sautille de joie
    if (turn % 3 === 0) {
      setPhase("visor");
      if (!(await step(5600))) return false;
    } else {
      setPhase("happy");
      if (!(await step(250))) return false;
      for (let round = 0; round < 2 && !reduced; round++) {
        setMotion("hop");
        if (!(await step(960))) return false;
        setMotion("shake");
        if (!(await step(480))) return false;
        setMotion("");
        if (!(await step(60))) return false; // relance l'animation CSS au tour suivant
      }
      if (!(await step(700))) return false;
    }

    // 5. l'écran s'éteint (trait, point, noir) avant le tour suivant
    setPhase("off");
    return step(2200);
  }, []);

  useEffect(() => {
    if (!auto) return;
    let stopped = false;
    void (async () => {
      setPhase("off");
      if (!(await sleep(600, alive))) return;
      for (let turn = 1; !stopped; turn++) {
        if (!(await cycle(turn, () => stopped))) return;
      }
    })();
    return () => {
      stopped = true;
      setMotion("");
    };
  }, [auto, cycle]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const height = Math.round((width * 18) / 16);
  const lit = phase === "gain" || phase === "happy" || phase === "visor";

  return (
    <span className={`${styles.minitel} ${motion ? styles[motion] : ""} ${className ?? ""}`} style={{ width, height, marginTop: inline ? -width / 4 : undefined }}>
      <svg viewBox="0 -4 16 18" width={width} height={height} shapeRendering="crispEdges" aria-hidden="true">
        {draw(ANTENNA)}
        <rect x={3} y={-4} width={1} height={1} fill={lit ? C.ledOn : C.light} className={lit ? styles.tip : ""} />
        {draw(BODY)}
        <rect x={12} y={11} width={1} height={1} fill={lit ? C.ledOn : C.led} className={lit ? "" : styles.led} />
        <g className={styles.screen}>
          {phase === "idle" && <rect x={SX + 1} y={SY + 6} width={2} height={1} fill={C.phosphor} className={styles.cursor} />}
          {phase === "eyes" && (
            <g className={styles.eyes}>
              <g className={styles.lids}>
                <rect x={SX + 2} y={SY + 2} width={3} height={3} fill={C.glow} />
                <rect x={SX + 7} y={SY + 2} width={3} height={3} fill={C.glow} />
                <g className={styles.pupils}>
                  <rect x={SX + 3} y={SY + 3} width={1} height={2} fill={C.screen} />
                  <rect x={SX + 8} y={SY + 3} width={1} height={2} fill={C.screen} />
                </g>
              </g>
            </g>
          )}
          {phase === "visor" && (
            <g className={styles.visor}>
              {draw(VISOR)}
              <g className={styles.visorPupils}>{draw(VISOR_PUPILS)}</g>
              <g className={styles.visorLids}>{draw(VISOR_LIDS)}</g>
              <g className={styles.cigar}>
                {draw(CIGAR)}
                {SMOKE.map(([x, y, w, h, fill], i) => (
                  <rect key={i} x={x} y={y} width={w} height={h} fill={fill} className={styles.smoke} style={{ animationDelay: `${i * 0.4}s` }} />
                ))}
              </g>
            </g>
          )}
          {phase === "curve" && <g>{draw(curveRects(columns))}</g>}
          {phase === "gain" && <g className={styles.gain}>{draw(GAIN)}</g>}
          {phase === "happy" && <g className={styles.happy}>{draw(HAPPY)}</g>}
          {phase === "off" && <rect x={SX} y={SY} width={12} height={8} fill={C.glow} className={styles.off} />}
        </g>
      </svg>
    </span>
  );
}
