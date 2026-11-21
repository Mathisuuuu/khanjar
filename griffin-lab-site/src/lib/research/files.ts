import type { AttachmentKind } from "./types";

/**
 * Types de fichiers acceptés en pièce jointe, par extension.
 * Les scripts sont servis en texte brut et en téléchargement : ils ne sont
 * jamais exécutés ni affichés comme page par le navigateur.
 */
const FILE_TYPES: Record<string, { kind: AttachmentKind; mime: string }> = {
  pdf: { kind: "pdf", mime: "application/pdf" },
  py: { kind: "script", mime: "text/plain; charset=utf-8" },
  pine: { kind: "script", mime: "text/plain; charset=utf-8" },
  r: { kind: "script", mime: "text/plain; charset=utf-8" },
  m: { kind: "script", mime: "text/plain; charset=utf-8" },
  jl: { kind: "script", mime: "text/plain; charset=utf-8" },
  js: { kind: "script", mime: "text/plain; charset=utf-8" },
  ts: { kind: "script", mime: "text/plain; charset=utf-8" },
  txt: { kind: "script", mime: "text/plain; charset=utf-8" },
  md: { kind: "script", mime: "text/plain; charset=utf-8" },
  ipynb: { kind: "notebook", mime: "application/x-ipynb+json" },
  csv: { kind: "data", mime: "text/csv; charset=utf-8" },
  json: { kind: "data", mime: "application/json" },
  xlsx: { kind: "data", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  parquet: { kind: "data", mime: "application/octet-stream" },
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo par fichier
export const MAX_FILES_PER_POST = 5;

/** Valeur de l'attribut `accept` du champ fichier. */
export const ACCEPTED_EXTENSIONS = Object.keys(FILE_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export function fileTypeOf(filename: string): { kind: AttachmentKind; mime: string } | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return FILE_TYPES[ext] ?? null;
}

/** Nom de fichier affichable et sans caractères problématiques. */
export function cleanFileName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "fichier";
  return base.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "fichier";
}

export function formatFileSize(bytes: number, locale: "fr" | "en" = "fr"): string {
  const [b, kb, mb] = locale === "en" ? ["B", "KB", "MB"] : ["o", "Ko", "Mo"];
  if (bytes < 1024) return `${bytes} ${b}`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ${kb}`;
  const value = (bytes / (1024 * 1024)).toFixed(1);
  return `${locale === "en" ? value : value.replace(".", ",")} ${mb}`;
}
