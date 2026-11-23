/**
 * Générateur de QR code minimal (norme ISO 18004, mode octets, versions 1 à 6,
 * jusqu'à ~100 caractères). Sert au QR code des certificats. Sans dépendance.
 */

type Level = "L" | "M" | "Q" | "H";

// [ecc par bloc, [nb blocs, octets de données par bloc][]]
const TABLE: Record<number, Record<Level, [number, [number, number][]]>> = {
  1: { L: [7, [[1, 19]]], M: [10, [[1, 16]]], Q: [13, [[1, 13]]], H: [17, [[1, 9]]] },
  2: { L: [10, [[1, 34]]], M: [16, [[1, 28]]], Q: [22, [[1, 22]]], H: [28, [[1, 16]]] },
  3: { L: [15, [[1, 55]]], M: [26, [[1, 44]]], Q: [18, [[2, 17]]], H: [22, [[2, 13]]] },
  4: { L: [20, [[1, 80]]], M: [18, [[2, 32]]], Q: [26, [[2, 24]]], H: [16, [[4, 9]]] },
  5: { L: [26, [[1, 108]]], M: [24, [[2, 43]]], Q: [18, [[2, 15], [2, 16]]], H: [22, [[2, 11], [2, 12]]] },
  6: { L: [18, [[2, 68]]], M: [16, [[4, 27]]], Q: [24, [[4, 19]]], H: [28, [[4, 15]]] },
};
const ALIGN: Record<number, number[]> = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };
const FORMAT_BITS: Record<Level, number> = { L: 1, M: 0, Q: 3, H: 2 };

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >> 7) * 0x11d);
    z ^= ((y >> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => (result[i] ^= gfMul(coef, factor)));
  }
  return result;
}

function encode(text: string, level: Level): { version: number; codewords: number[] } {
  const data = [...new TextEncoder().encode(text)];
  let version = 1;
  for (; version <= 6; version++) {
    const capacity = TABLE[version][level][1].reduce((sum, [n, k]) => sum + n * k, 0);
    if (12 + 8 * data.length <= capacity * 8) break;
  }
  if (version > 6) throw new Error("Texte trop long pour le QR code.");
  const [eccLen, groups] = TABLE[version][level];
  const capacity = groups.reduce((sum, [n, k]) => sum + n * k, 0);

  const bits: number[] = [0, 1, 0, 0];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };
  push(data.length, 8);
  data.forEach((b) => push(b, 8));
  for (let i = 0; i < 4 && bits.length < capacity * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const words: number[] = [];
  for (let i = 0; i < bits.length; i += 8) words.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0xec; words.length < capacity; pad ^= 0xec ^ 0x11) words.push(pad);

  const divisor = rsDivisor(eccLen);
  const blocks: { data: number[]; ecc: number[] }[] = [];
  let pos = 0;
  for (const [n, k] of groups) {
    for (let i = 0; i < n; i++) {
      const block = words.slice(pos, pos + k);
      pos += k;
      blocks.push({ data: block, ecc: rsRemainder(block, divisor) });
    }
  }
  const codewords: number[] = [];
  const longest = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < longest; i++) for (const b of blocks) if (i < b.data.length) codewords.push(b.data[i]);
  for (let i = 0; i < eccLen; i++) for (const b of blocks) codewords.push(b.ecc[i]);
  return { version, codewords };
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Matrice du QR code (`true` = module sombre), sans marge. */
export function qrMatrix(text: string, level: Level = "H"): boolean[][] {
  const { version, codewords } = encode(text, level);
  const size = version * 4 + 17;
  const m = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => {
    m[y][x] = dark;
    fn[y][x] = true;
  };

  const drawFormat = (mask: number) => {
    const data = (FORMAT_BITS[level] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((bits >> i) & 1) === 1;
    for (let i = 0; i < 6; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };

  // motifs fixes : synchronisation, repères, alignement, zones de format
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, dist !== 2 && dist !== 4);
      }
    }
  }
  const align = ALIGN[version];
  const n = align.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) set(align[i] + dx, align[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }
  drawFormat(0);

  // données, en zigzag de droite à gauche
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fn[y][x] && i < codewords.length * 8) {
          m[y][x] = ((codewords[i >> 3] >> (7 - (i & 7))) & 1) === 1;
          i++;
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
  };
  const penalty = () => {
    let score = 0;
    const lines = [...m, ...m.map((_, x) => m.map((row) => row[x]))];
    const finderA = [true, false, true, true, true, false, true, false, false, false, false].join();
    const finderB = [false, false, false, false, true, false, true, true, true, false, true].join();
    for (const line of lines) {
      let run = 1;
      for (let k = 1; k <= size; k++) {
        if (k < size && line[k] === line[k - 1]) run++;
        else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      const padded = [false, false, false, false, ...line, false, false, false, false];
      for (let k = 0; k + 11 <= padded.length; k++) {
        const w = padded.slice(k, k + 11).join();
        if (w === finderA || w === finderB) score += 40;
      }
    }
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
    const dark = m.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    score += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    return score;
  };

  let best = { score: Infinity, mask: 0 };
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormat(mask);
    const score = penalty();
    if (score < best.score) best = { score, mask };
    applyMask(mask);
  }
  applyMask(best.mask);
  drawFormat(best.mask);
  return m;
}

/** QR code en SVG (modules sombres sur fond clair, marge de 4 modules). */
export function qrSvg(text: string, dark = "#000", light = "#fff"): string {
  const m = qrMatrix(text);
  const border = 4;
  const n = m.length + border * 2;
  let path = "";
  m.forEach((row, y) => row.forEach((on, x) => on && (path += `M${x + border},${y + border}h1v1h-1z`)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}
