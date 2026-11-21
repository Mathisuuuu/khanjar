"use client";

import { useState, type CSSProperties } from "react";
import type { PdfFile } from "@/lib/research/pdf-client";
import { PdfViewer } from "./PdfViewer";
import { usePdfThumbnails } from "./usePdfThumbnails";
import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./Research.module.css";

/**
 * Position de chaque carte : celle du milieu devant et droite, les autres
 * derrière, inclinées et plus basses. `h*` : position au survol du groupe.
 */
const layouts: Record<number, { x: number; y: number; r: number; hx: number; hy: number; hr: number }[]> = {
  1: [{ x: 0, y: 0, r: 0, hx: 0, hy: -10, hr: 0 }],
  2: [
    { x: -40, y: 8, r: -6, hx: -58, hy: -2, hr: -9 },
    { x: 40, y: 8, r: 6, hx: 58, hy: -2, hr: 9 },
  ],
  3: [
    { x: -76, y: 16, r: -8, hx: -100, hy: 4, hr: -11 },
    { x: 0, y: 0, r: 0, hx: 0, hy: -12, hr: 0 },
    { x: 76, y: 16, r: 8, hx: 100, hy: 4, hr: 11 },
  ],
};

/** Les PDF d'un groupe, en cartes qui dépassent du haut de sa carte. Un clic ouvre le lecteur. */
export function PdfFan({ files, groupName }: { files: PdfFile[]; groupName: string }) {
  const t = useT();
  const shown = files.slice(0, 3);
  const images = usePdfThumbnails(shown);
  const [openAt, setOpenAt] = useState<number | null>(null);
  const layout = layouts[shown.length];

  return (
    <>
      <div className={styles.fan}>
        {shown.map((file, i) => {
          const p = layout[i];
          const isCenter = p.x === 0;
          return (
            <button
              key={file.id}
              type="button"
              className={styles.fanCard}
              style={
                {
                  "--x": `${p.x}px`,
                  "--y": `${p.y}px`,
                  "--r": `${p.r}deg`,
                  "--hx": `${p.hx}px`,
                  "--hy": `${p.hy}px`,
                  "--hr": `${p.hr}deg`,
                  zIndex: isCenter ? 3 : 1 + i,
                } as CSSProperties
              }
              aria-label={t(`Lire ${file.name} (${groupName})`, `Read ${file.name} (${groupName})`)}
              onClick={() => setOpenAt(i)}
            >
              {/* miniature générée côté client (data URL) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[i]} alt="" />
              <span>{file.name}</span>
            </button>
          );
        })}
      </div>
      {openAt !== null && <PdfViewer files={files} startIndex={openAt} onClose={() => setOpenAt(null)} />}
    </>
  );
}
