import { NextResponse } from "next/server";
import { contentAccess } from "@/lib/books/repository";
import { readStrategyFile } from "@/lib/books/strategies";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

/**
 * GET /api/books/files/:id : télécharge un fichier d'une stratégie d'un book.
 * Un administrateur, un membre autorisé par un administrateur, ou l'auteur de
 * la stratégie ; 404 pour tous les autres (on ne révèle pas l'existence du fichier). Les PDF s'ouvrent dans le navigateur, le reste se télécharge.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [found, viewer] = await Promise.all([readStrategyFile(id), getViewer()]);
  const access = found ? await contentAccess(found.bookId, viewer) : "none";
  const allowed = access === "all" || (access === "own" && found?.ownerKey === viewer?.id);
  if (!found || !allowed) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const { file, data } = found;
  const disposition = file.kind === "pdf" ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
