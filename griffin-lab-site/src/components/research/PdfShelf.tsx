"use client";

import { useState } from "react";
import { ImagesBadge } from "@/components/ui/ImagesBadge";
import type { PdfFile } from "@/lib/research/pdf-client";
import { PdfViewer } from "./PdfViewer";
import { usePdfThumbnails } from "./usePdfThumbnails";
import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./Research.module.css";

/** Dossier animé (ImagesBadge) qui ouvre les PDF d'une publication dans le lecteur intégré. */
export function PdfShelf({ files }: { files: PdfFile[] }) {
  const images = usePdfThumbnails(files);
  const [open, setOpen] = useState(false);
  const t = useT();
  const text =
    files.length > 1
      ? t(`Lire les ${files.length} PDF dans l'appli`, `Read the ${files.length} PDFs in the app`)
      : t("Lire le PDF dans l'appli", "Read the PDF in the app");

  return (
    <>
      <ImagesBadge text={text} images={images} onClick={() => setOpen(true)} className={styles.shelf} />
      {open && <PdfViewer files={files} onClose={() => setOpen(false)} />}
    </>
  );
}
