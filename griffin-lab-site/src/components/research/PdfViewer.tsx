"use client";

import { useEffect, useRef, useState } from "react";
import { openPdf, pdfUrl, type PdfFile } from "@/lib/research/pdf-client";
import styles from "./Research.module.css";

type PdfDoc = Awaited<ReturnType<typeof openPdf>>["doc"];

type PdfViewerProps = {
  files: PdfFile[];
  startIndex?: number;
  onClose: () => void;
};

/**
 * Lecteur PDF intégré (fenêtre modale). Les pages sont dessinées par pdf.js
 * au fil du défilement : fonctionne aussi sur mobile, où les navigateurs
 * n'affichent pas les PDF dans une iframe.
 */
export function PdfViewer({ files, startIndex = 0, onClose }: PdfViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);
  const [state, setState] = useState<{ doc: PdfDoc; ratio: number } | "loading" | "error">("loading");
  const [width, setWidth] = useState(0);
  const file = files[index];

  useEffect(() => {
    // pas de close() au nettoyage : il déclencherait onClose (et React relance l'effet en mode strict) ;
    // le démontage retire de toute façon la fenêtre
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // largeur disponible pour les pages
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    // mesure immédiate, puis suivi des redimensionnements
    const style = getComputedStyle(body);
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    setWidth(Math.min(body.clientWidth - padding, 900));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(entry.contentRect.width, 900)));
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let close: (() => void) | undefined;
    setState("loading");
    bodyRef.current?.scrollTo({ top: 0 });
    // garde l'onglet du fichier ouvert visible (barre d'onglets étroite sur mobile)
    dialogRef.current
      ?.querySelector('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    openPdf(file.id)
      .then(async (opened) => {
        close = opened.close;
        const { doc } = opened;
        if (cancelled) return close();
        const first = (await doc.getPage(1)).getViewport({ scale: 1 });
        if (!cancelled) setState({ doc, ratio: first.width / first.height });
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
      close?.();
    };
  }, [file.id]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.viewer}
      aria-label={`Lecteur PDF : ${file.name}`}
      onClose={onClose}
      onClick={(event) => {
        // clic sur le fond : ferme
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
    >
      <div className={styles.viewerHead}>
        {files.length > 1 ? (
          <div className={styles.viewerTabs} role="tablist" aria-label="Fichiers PDF">
            {files.map((f, i) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={styles.viewerTab}
                onClick={() => setIndex(i)}
              >
                {f.name}
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.viewerTitle}>{file.name}</p>
        )}
        <div className={styles.viewerActions}>
          <a href={pdfUrl(file.id)} download={file.name} className={styles.danger}>
            Télécharger
          </a>
          <button type="button" className={styles.danger} onClick={() => dialogRef.current?.close()}>
            Fermer
          </button>
        </div>
      </div>

      <div ref={bodyRef} className={styles.viewerBody}>
        {state === "loading" && <p className={styles.note}>Chargement du PDF…</p>}
        {state === "error" && (
          <p className={styles.note}>
            Ce PDF ne peut pas être affiché ici.{" "}
            <a href={pdfUrl(file.id)} target="_blank" rel="noopener" className={styles.link}>
              L&apos;ouvrir dans un nouvel onglet
            </a>
          </p>
        )}
        {typeof state === "object" &&
          width > 0 &&
          Array.from({ length: state.doc.numPages }, (_, i) => (
            <PdfPage
              key={`${file.id}-${i}`}
              doc={state.doc}
              pageNumber={i + 1}
              width={width}
              ratio={state.ratio}
              root={bodyRef.current}
            />
          ))}
      </div>
    </dialog>
  );
}

/** `root` : zone qui défile dans le lecteur (les pages hors de cette zone sont masquées par elle). */
type PdfPageProps = { doc: PdfDoc; pageNumber: number; width: number; ratio: number; root: Element | null };

/** Une page, dessinée quand elle approche de la zone visible. */
function PdfPage({ doc, pageNumber, width, ratio, root }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), {
      root,
      rootMargin: "800px 0px",
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [root]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible || !canvas) return;
    let task: { cancel: () => void } | undefined;
    let cancelled = false;
    doc.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width * dpr) / page.getViewport({ scale: 1 }).width });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const render = page.render({ canvas, viewport });
      task = render;
      render.promise.catch(() => undefined);
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [visible, doc, pageNumber, width]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.viewerPage}
      style={{ width, aspectRatio: String(ratio) }}
      aria-label={`Page ${pageNumber}`}
      role="img"
    />
  );
}
