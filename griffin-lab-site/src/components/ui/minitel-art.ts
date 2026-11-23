/**
 * Pixels de l'avatar Minitel de Fleija, partagés entre le composant animé (Minitel.tsx, en SVG)
 * et le favicon animé (minitel-favicon.ts, sur un canvas).
 * Grille 16 × 18 : antenne sur les lignes −4 à −1, boîtier de 0 à 13.
 */


export type Rect = [x: number, y: number, w: number, h: number, fill: string];

export const C = {
  light: "#e6e8ec",
  body: "#c3c7ce",
  shade: "#9399a3",
  bezel: "#7b818b",
  vent: "#5d626b",
  screen: "#0c1d14",
  phosphor: "#4ade80",
  glow: "#a7f3c4",
  loss: "#f87171",
  led: "#ef4444",
  ledOn: "#4ade80",
};

/** Petite antenne droite, à gauche du boîtier (lignes −3 à −1) ; sa pointe est dessinée à part. */
export const ANTENNA: Rect[] = [
  [2, -1, 3, 1, C.shade],
  [3, -3, 1, 2, C.bezel],
];

/** Boîtier gris et écran éteint (grille 16 × 14). */
export const BODY: Rect[] = [
  [1, 0, 14, 1, C.light],
  [0, 1, 16, 13, C.body],
  [0, 1, 1, 12, C.light],
  [15, 1, 1, 13, C.shade],
  [0, 13, 16, 1, C.shade],
  [1, 1, 14, 10, C.bezel],
  [2, 2, 12, 8, C.screen],
  [2, 2, 1, 1, C.bezel],
  [13, 2, 1, 1, C.bezel],
  [2, 9, 1, 1, C.bezel],
  [13, 9, 1, 1, C.bezel],
  [3, 11, 1, 1, C.vent],
  [5, 11, 1, 1, C.vent],
  [7, 11, 1, 1, C.vent],
];

/** Coin haut-gauche de l'écran (12 × 8 pixels). */
export const SX = 2;
export const SY = 2;

/** Courbe du trade, une valeur par colonne d'écran (0 = en haut) : perd un peu, puis gagne beaucoup. */
export const CURVE = [3, 4, 4, 5, 5, 4, 3, 2, 1, 1, 0, 0];
export const LOSS_UNTIL = 4; // colonnes 1 à 4 : la baisse, en rouge

export function curveRects(count: number): Rect[] {
  const rects: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const prev = CURVE[Math.max(0, i - 1)];
    const top = Math.min(prev, CURVE[i]);
    const fill = i === 0 ? C.glow : i <= LOSS_UNTIL ? C.loss : C.phosphor;
    rects.push([SX + i, SY + top, 1, Math.abs(prev - CURVE[i]) + 1, fill]);
  }
  return rects;
}

/** Pixels allumés d'un motif (« # »), à partir d'un point de l'écran ; `size` : taille d'un pixel du motif. */
export function glyph(rows: string[], x: number, y: number, fill: string, size = 1): Rect[] {
  return rows.flatMap((row, dy) =>
    [...row].flatMap((c, dx) => (c === "#" ? [[SX + x + dx * size, SY + y + dy * size, size, size, fill] as Rect] : [])),
  );
}

/** « +3% » en police 3 × 5 à demi-pixels (5,5 × 2,5), au milieu de l'écran. */
export const GAIN: Rect[] = [
  ...glyph(["...", ".#.", "###", ".#.", "..."], 3.5, 2.5, C.phosphor, 0.5),
  ...glyph(["###", "..#", ".##", "..#", "###"], 5.5, 2.5, C.phosphor, 0.5),
  ...glyph(["#.#", "..#", ".#.", "#..", "#.#"], 7.5, 2.5, C.phosphor, 0.5),
];

/** Yeux contents « ^ ^ ». */
export const HAPPY: Rect[] = [...glyph([".#.", "#.#"], 2, 3, C.glow), ...glyph([".#.", "#.#"], 7, 3, C.glow)];

/** Visière de robot (clin d'œil) : bandeau, yeux, pupilles, paupières mi-closes, cigare et fumée. */
export const VISOR: Rect[] = [
  ...glyph([".########.", "##########", "##########", ".########."], 1, 1, C.phosphor),
  [SX + 2, SY + 2, 3, 2, "#f0fdf4"],
  [SX + 7, SY + 2, 3, 2, "#f0fdf4"],
];
export const VISOR_PUPILS: Rect[] = [
  [SX + 3, SY + 2, 1, 2, C.screen],
  [SX + 8, SY + 2, 1, 2, C.screen],
];
export const VISOR_LIDS: Rect[] = [
  [SX + 2, SY + 2, 3, 1, C.phosphor],
  [SX + 7, SY + 2, 3, 1, C.phosphor],
];
export const CIGAR: Rect[] = [
  [SX + 7, SY + 6, 3, 1, "#9a6b3f"],
  [SX + 10, SY + 6, 1, 1, "#fb923c"],
];
export const SMOKE: Rect[] = [
  [SX + 10, SY + 5, 1, 1, "#9ca3af"],
  [SX + 11, SY + 4, 1, 1, "#9ca3af"],
  [SX + 10, SY + 4, 1, 1, "#9ca3af"],
];
