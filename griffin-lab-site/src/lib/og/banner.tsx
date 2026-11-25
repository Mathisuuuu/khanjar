import "server-only";
import { ImageResponse } from "next/og";
import { ANTENNA, BODY, C, SX, SY, type Rect } from "@/components/ui/minitel-art";

/**
 * Bannière de partage (1200 × 630) : l'aperçu affiché quand on colle le lien du
 * site sur Discord, WhatsApp, X, LinkedIn… Le Minitel de Fleija à gauche, ce
 * qu'est le site et comment il marche à droite, en anglais (lue partout). Rendue
 * une fois à la construction.
 */

export const BANNER_SIZE = { width: 1200, height: 630 };
export const BANNER_ALT = "Fleija, the trading bot built by its community: submit a strategy, it goes through the test script, it joins a book.";

type Font = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" };

/** Sans en-tête de navigateur, Google Fonts renvoie des TTF (lisibles par next/og). */
async function loadFonts(): Promise<Font[]> {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@700&display=swap", {
        signal: AbortSignal.timeout(8000),
      })
    ).text();
    const fonts: Font[] = [];
    for (const [, face] of css.matchAll(/@font-face\s*{([^}]*)}/g)) {
      const name = /font-family:\s*'([^']+)'/.exec(face)?.[1];
      const weight = Number(/font-weight:\s*(\d+)/.exec(face)?.[1] ?? 400) as Font["weight"];
      const url = /src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(face)?.[1];
      if (!name || !url) continue;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) fonts.push({ name, data: await res.arrayBuffer(), weight, style: "normal" });
    }
    return fonts;
  } catch (error) {
    // sans réseau : police par défaut de next/og, la bannière reste lisible
    console.error("Polices de la bannière indisponibles :", error instanceof Error ? error.message : error);
    return [];
  }
}

/** Minitel allumé, les yeux ouverts (comme au début de l'animation du site). */
const EYES: Rect[] = [
  [SX + 2, SY + 2, 3, 3, C.glow],
  [SX + 7, SY + 2, 3, 3, C.glow],
  [SX + 3, SY + 3, 1, 2, C.screen],
  [SX + 8, SY + 3, 1, 2, C.screen],
];
const MINITEL: Rect[] = [[3, -4, 1, 1, C.light], ...ANTENNA, ...BODY, ...EYES, [12, 11, 1, 1, C.ledOn]];
const CELL = 20;
const TOP = 4; // l'antenne monte jusqu'à la ligne −4

const STEPS = ["You submit your strategy", "It goes through the test script", "Validated: it joins a book"];

export async function renderBanner() {
  const fonts = await loadFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 70px 0 80px",
          background: "#08090a",
          backgroundImage: "radial-gradient(circle at 22% 52%, rgba(34,197,94,0.20), rgba(8,9,10,0) 46%)",
          fontFamily: "Inter",
          color: "#f7f8f8",
        }}
      >
        {/* le Minitel en pixels */}
        <div style={{ position: "relative", display: "flex", width: 16 * CELL, height: 18 * CELL, flexShrink: 0 }}>
          {MINITEL.map(([x, y, w, h, fill], i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x * CELL,
                top: (y + TOP) * CELL,
                width: w * CELL,
                height: h * CELL,
                background: fill,
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginLeft: 66, flex: 1 }}>
          <div style={{ display: "flex", fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 26, letterSpacing: 6, color: "#4ade80" }}>
            FLEIJA
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 54, fontWeight: 800, lineHeight: 1.06, letterSpacing: -2 }}>
            The trading bot built by its community
          </div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 25, lineHeight: 1.36, color: "#a1a1aa" }}>
            Submit an idea, a script or a research paper. Once validated, it unlocks the whole book for you, for free.
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 24, gap: 10 }}>
            {STEPS.map((step, i) => (
              <div key={step} style={{ display: "flex", alignItems: "center", fontSize: 23, fontWeight: 700 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    marginRight: 14,
                    borderRadius: 999,
                    background: "rgba(34,197,94,0.16)",
                    border: "2px solid rgba(74,222,128,0.55)",
                    color: "#4ade80",
                    fontSize: 18,
                  }}
                >
                  {i + 1}
                </div>
                {step}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 26, fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 22, color: "#71717a" }}>
            fleija.live
          </div>
        </div>
      </div>
    ),
    { ...BANNER_SIZE, fonts },
  );
}
