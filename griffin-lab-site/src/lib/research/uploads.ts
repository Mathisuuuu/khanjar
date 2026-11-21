import "server-only";
import { cleanFileName, fileTypeOf, formatFileSize, MAX_FILE_SIZE } from "@/lib/research/files";
import type { NewAttachment } from "@/lib/research/repository";

/**
 * Lit et vérifie les fichiers envoyés dans le champ `files` d'un formulaire.
 * `existing` : fichiers déjà gardés, pour respecter `max`. Renvoie un message d'erreur sinon.
 */
export async function readUploads(form: FormData, existing: number, max: number): Promise<NewAttachment[] | string> {
  const uploads = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (existing + uploads.length > max) return `${max} fichiers maximum.`;

  const files: NewAttachment[] = [];
  for (const file of uploads) {
    const type = fileTypeOf(file.name);
    if (!type) return `Type de fichier non accepté : ${file.name}`;
    if (file.size > MAX_FILE_SIZE) return `${file.name} dépasse ${formatFileSize(MAX_FILE_SIZE)}.`;
    const data = Buffer.from(await file.arrayBuffer());
    // un « PDF » doit vraiment en être un : il est affiché dans le navigateur
    if (type.kind === "pdf" && data.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return `${file.name} n'est pas un PDF valide.`;
    }
    files.push({ name: cleanFileName(file.name), size: file.size, mime: type.mime, kind: type.kind, data });
  }
  return files;
}
