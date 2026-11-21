import { NextResponse } from "next/server";
import { canRead } from "@/lib/research/access";
import { getResearchRepository } from "@/lib/research/repository";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

/**
 * GET /api/research/files/:id : télécharge une pièce jointe.
 * Mêmes droits que la lecture du groupe ; 404 sinon (on ne révèle pas
 * l'existence d'un fichier d'un groupe privé). Les PDF s'ouvrent dans le
 * navigateur, tout le reste est proposé en téléchargement.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getResearchRepository().readAttachment(id);
  if (!found || !canRead(found.group, await getViewer())) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const { attachment, data } = found;
  const disposition = attachment.kind === "pdf" ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": attachment.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
