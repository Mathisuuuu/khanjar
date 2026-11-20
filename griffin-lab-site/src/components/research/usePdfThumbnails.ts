"use client";

import { useEffect, useState } from "react";
import { getPdfThumbnail, placeholderThumbnail, type PdfFile } from "@/lib/research/pdf-client";

/** Miniature de la première page de chaque PDF ; une page stylisée en attendant. */
export function usePdfThumbnails(files: PdfFile[]): string[] {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const ids = files.map((f) => f.id).join(",");

  useEffect(() => {
    let cancelled = false;
    for (const id of ids.split(",").filter(Boolean)) {
      getPdfThumbnail(id).then((url) => {
        if (url && !cancelled) setThumbs((current) => ({ ...current, [id]: url }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return files.map((f) => thumbs[f.id] ?? placeholderThumbnail(f.name));
}
