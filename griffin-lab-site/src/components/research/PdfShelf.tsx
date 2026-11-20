"use client";

import { useState } from "react";
import { ImagesBadge } from "@/components/ui/ImagesBadge";
import type { PdfFile } from "@/lib/research/pdf-client";
import { PdfViewer } from "./PdfViewer";
import { usePdfThumbnails } from "./usePdfThumbnails";
import styles from "./Research.module.css";

/** Dossier animé (ImagesBadge) qui ouvre les PDF d'une publication dans le lecteur intégré. */
export function PdfShelf({ files }: { files: PdfFile[] }) {
  const images = usePdfThumbnails(files);
  const [open, setOpen] = useState(false);
  const text = files.length > 1 ? `Lire les ${files.length} PDF dans l'appli` : "Lire le PDF dans l'appli";

  return (
    <>
      <ImagesBadge text={text} images={images} onClick={() => setOpen(true)} className={styles.shelf} />
      {open && <PdfViewer files={files} onClose={() => setOpen(false)} />}
    </>
  );
}
