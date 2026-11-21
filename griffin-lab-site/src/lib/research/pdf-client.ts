/**
 * Lecture des PDF dans le navigateur avec pdf.js (chargé à la demande).
 * Sert au lecteur intégré et aux miniatures des cartes. Les fichiers passent
 * par /api/research/files/:id, qui vérifie les droits du groupe.
 */

export type PdfFile = { id: string; name: string };

type PdfJs = typeof import("pdfjs-dist");

let pdfjs: Promise<PdfJs> | undefined;

export function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= import("pdfjs-dist").then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return lib;
  });
  return pdfjs;
}

export const pdfUrl = (id: string) => `/api/research/files/${id}`;

/** Ouvre un PDF ; `close` libère le document et le worker. */
export async function openPdf(id: string) {
  const lib = await loadPdfJs();
  const task = lib.getDocument({ url: pdfUrl(id) });
  return { doc: await task.promise, close: () => void task.destroy() };
}

const THUMB_WIDTH = 320;
const thumbnails = new Map<string, Promise<string | null>>();

/** Première page du PDF en image (mise en cache) ; `null` si le fichier ne se lit pas. */
export function getPdfThumbnail(id: string): Promise<string | null> {
  let thumbnail = thumbnails.get(id);
  if (!thumbnail) {
    thumbnail = renderThumbnail(id).catch((error) => {
      console.warn("Miniature PDF impossible :", error);
      return null;
    });
    thumbnails.set(id, thumbnail);
  }
  return thumbnail;
}

async function renderThumbnail(id: string): Promise<string> {
  const { doc, close } = await openPdf(id);
  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: THUMB_WIDTH / page.getViewport({ scale: 1 }).width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    close();
  }
}

/** Page stylisée affichée en attendant la miniature (ou si le PDF ne se lit pas). */
export function placeholderThumbnail(name: string): string {
  const title = name
    .replace(/\.pdf$/i, "")
    .slice(0, 22)
    .replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 414">
<rect width="320" height="414" fill="#f4f4f5"/>
<rect x="28" y="30" width="56" height="24" rx="4" fill="#ef4444"/>
<text x="56" y="47" font-family="sans-serif" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">PDF</text>
<text x="28" y="92" font-family="sans-serif" font-size="19" font-weight="700" fill="#18181b">${title}</text>
${[124, 146, 168, 190, 226, 248, 270, 292, 314]
  .map((y, i) => `<rect x="28" y="${y}" width="${i % 4 === 3 ? 170 : 264}" height="9" rx="4" fill="#d4d4d8"/>`)
  .join("")}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
