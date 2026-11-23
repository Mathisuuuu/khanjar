import "server-only";
/* eslint-disable @next/next/no-img-element -- image générée par ImageResponse (satori), où next/image n'existe pas */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
// sharp est installé avec Next (optimisation des images) et laissé hors du bundle serveur par Next
import sharp from "sharp";
import { getDb } from "@/lib/db";
import { qrSvg } from "@/lib/shared/qr";
import type { Certificate } from "./settings";

/**
 * Certificat envoyé à l'auteur d'une stratégie validée (image PNG, en anglais
 * comme le serveur Discord). Refait à chaque fois : pseudo, score et date de la
 * validation. Rendu par next/og avec les polices du site (Newsreader, JetBrains
 * Mono) et une police manuscrite pour la signature, lues chez Google Fonts.
 */

const BRAND = "Fleija";
const SIGNATURE = "Fleija";
export const CERTIFICATE_WIDTH = 1500;
export const CERTIFICATE_HEIGHT = 1060;

const siteUrl = () => (process.env.AUTH_URL ?? "https://fleija.live").replace(/\/$/, "");

/* ---------- Polices ---------- */

type Font = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};
const FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Newsreader:wght@400&family=JetBrains+Mono:wght@400;700&family=Mrs+Saint+Delafield&display=swap";
let fontsPromise: Promise<Font[]> | null = null;

/** Sans en-tête de navigateur, Google Fonts renvoie des fichiers TTF (lisibles par next/og). */
async function loadFonts(): Promise<Font[]> {
  const css = await (await fetch(FONTS_CSS, { signal: AbortSignal.timeout(8000) })).text();
  const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => m[1]);
  const fonts: Font[] = [];
  for (const face of faces) {
    const name = /font-family:\s*'([^']+)'/.exec(face)?.[1];
    const weight = Number(/font-weight:\s*(\d+)/.exec(face)?.[1] ?? 400) >= 700 ? 700 : 400;
    const url = /src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(face)?.[1];
    if (!name || !url) continue;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok)
      fonts.push({
        name,
        data: await res.arrayBuffer(),
        weight,
        style: "normal",
      });
  }
  if (fonts.length === 0) throw new Error("aucune police reçue");
  return fonts;
}

/** Polices gardées en mémoire ; en cas d'échec, police par défaut (et nouvel essai la fois suivante). */
async function fonts(): Promise<Font[]> {
  fontsPromise ??= loadFonts();
  try {
    return await fontsPromise;
  } catch (error) {
    fontsPromise = null;
    console.error("Polices du certificat indisponibles :", error instanceof Error ? error.message : error);
    return [];
  }
}

/* ---------- Données ---------- */

export type CertificateData = {
  name: string;
  score: number | null;
  date: Date;
};

/** Pseudo actuel de l'auteur (celui de la proposition s'il n'a plus de profil), score et date de validation. */
export async function certificateFor(certificate: Certificate): Promise<CertificateData> {
  const db = await getDb();
  const [profile] = await db.query<{ pseudo: string }>("SELECT pseudo FROM profiles WHERE user_key = $1", [certificate.authorId]);
  return { name: profile?.pseudo || certificate.pseudo, score: certificate.score, date: new Date(certificate.validatedAt) };
}

/** Images déjà rendues (même pseudo, score et date), pour ne pas refaire le rendu à chaque affichage du profil. */
const renderCache = new Map<string, Promise<Buffer>>();
const RENDER_CACHE_SIZE = 40;

/** PNG du certificat, refait dès que le pseudo, le score ou la date changent. */
export async function certificateImage(certificate: Certificate): Promise<Buffer> {
  const data = await certificateFor(certificate);
  const key = JSON.stringify([certificate.id, data.name, data.score, data.date.toISOString()]);
  let image = renderCache.get(key);
  if (!image) {
    image = renderCertificate(data);
    renderCache.set(key, image);
    image.catch(() => renderCache.delete(key));
    if (renderCache.size > RENDER_CACHE_SIZE) renderCache.delete(renderCache.keys().next().value!);
  }
  return image;
}

/* ---------- Image ---------- */

const svgData = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** Image JPEG du dossier, en data URI, lue une seule fois (`null` si absente). */
const cache = new Map<string, Promise<string | null>>();
function jpeg(file: string): Promise<string | null> {
  let promise = cache.get(file);
  if (!promise) {
    promise = readFile(path.join(process.cwd(), "src/lib/certificates", file))
      .then((data) => `data:image/jpeg;base64,${data.toString("base64")}`)
      .catch(() => null);
    cache.set(file, promise);
  }
  return promise;
}
/** Fond (avion et traînée lumineuse), recadré en 1500 × 1060. */
const background = () => jpeg("background.jpg");

/**
 * Grain (1500 × 1060) posé en mode « superposition » (overlay) : l'opacité est
 * mise dans le canal alpha, que le mélange de libvips respecte. L'image de grain
 * (gris moyen 196) est recentrée sur le gris moyen avec deux fois plus de
 * contraste, pour qu'elle assombrisse autant qu'elle éclaircit. La superposition
 * ne fait rien sur un noir pur : le noir est d'abord relevé de BLACK_LIFT.
 */
const GRAIN_OPACITY = 0.3;
const GRAIN_CONTRAST = 2;
const GRAIN_MEAN = 196;
const BLACK_LIFT = 16;
let grainPromise: Promise<Buffer | null> | null = null;
const grain = () =>
  (grainPromise ??= sharp(path.join(process.cwd(), "src/lib/certificates/grain.jpg"))
    .greyscale()
    .linear(GRAIN_CONTRAST, 128 - GRAIN_CONTRAST * GRAIN_MEAN)
    .toColourspace("srgb")
    .ensureAlpha(GRAIN_OPACITY)
    .png()
    .toBuffer()
    .catch(() => null));

/** Certificat en PNG. */
export async function renderCertificate({ name, score, date }: CertificateData): Promise<Buffer> {
  const [loaded, backdrop] = await Promise.all([fonts(), background()]);
  const has = (family: string) => loaded.some((f) => f.name === family);
  const serif = has("Newsreader") ? "Newsreader" : undefined;
  const mono = has("JetBrains Mono") ? "JetBrains Mono" : undefined;
  const script = has("Mrs Saint Delafield") ? "Mrs Saint Delafield" : serif;
  const dateText = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const nameSize = name.length > 22 ? 76 : name.length > 15 ? 96 : 116;

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        color: "#d9d9de",
        fontFamily: serif,
        background: "#08080a",
      }}
    >
      {backdrop && (
        <img
          src={backdrop}
          width={CERTIFICATE_WIDTH}
          height={CERTIFICATE_HEIGHT}
          style={{ position: "absolute", top: 0, left: 0 }}
          alt=""
        />
      )}

      <div
        style={{
          position: "absolute",
          top: 34,
          left: 46,
          fontSize: 38,
          color: "#ececf0",
          display: "flex",
        }}
      >
        {BRAND}
      </div>

      <div
        style={{
          marginTop: 118,
          fontSize: 108,
          letterSpacing: 1,
          display: "flex",
        }}
      >
        Book Certificate
      </div>

      {/* bloc central : centré dans la page, un peu sous le milieu pour laisser la place au titre */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 110,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontFamily: mono,
            letterSpacing: 2,
            color: "#d4d4d8",
            display: "flex",
          }}
        >
          Proudly awarded to
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: nameSize,
            color: "#ececf0",
            display: "flex",
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 14,
            width: 720,
            height: 4,
            borderRadius: 4,
            background: "linear-gradient(90deg, rgba(160,160,170,0) 0%, rgba(200,200,210,0.9) 50%, rgba(160,160,170,0) 100%)",
            display: "flex",
          }}
        />

        <div
          style={{
            marginTop: 56,
            fontSize: 40,
            fontFamily: mono,
            color: "#e4e4e7",
            display: "flex",
          }}
        >
          {score === null ? "Validated" : "Score"}
        </div>
        {score !== null && (
          <div
            style={{
              marginTop: 4,
              fontSize: 30,
              fontFamily: mono,
              color: "#c4c4cc",
              display: "flex",
            }}
          >{`${score}/100`}</div>
        )}
      </div>

      {/* QR code blanc sans fond (sa marge de 4 modules est transparente : les modules commencent à ~46 px du bord) */}
      <img
        src={svgData(qrSvg(siteUrl(), "#ececf0", "none"))}
        width={240}
        height={240}
        style={{ position: "absolute", left: 20, bottom: 20 }}
        alt=""
      />

      <div
        style={{
          position: "absolute",
          right: 56,
          bottom: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            fontSize: 118,
            fontFamily: script,
            color: "#e4e4e7",
            lineHeight: 1,
            display: "flex",
          }}
        >
          {SIGNATURE}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 26,
            fontFamily: mono,
            fontWeight: 700,
            color: "#d4d4d8",
            display: "flex",
          }}
        >
          {dateText}
        </div>
      </div>
    </div>,
    { width: CERTIFICATE_WIDTH, height: CERTIFICATE_HEIGHT, fonts: loaded },
  );

  // grain sur toute l'image, texte compris, en vraie superposition (next/og ignore mix-blend-mode)
  const rendered = Buffer.from(await image.arrayBuffer());
  const noise = await grain();
  if (!noise) return rendered;
  const lifted = await sharp(rendered)
    .removeAlpha()
    .linear(1 - BLACK_LIFT / 255, BLACK_LIFT)
    .toBuffer();
  return sharp(lifted)
    .composite([{ input: noise, blend: "overlay" }])
    .png()
    .toBuffer();
}
