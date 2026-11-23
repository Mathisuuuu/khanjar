import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { certificateImage } from "@/lib/certificates/certificate";
import { canViewCertificate, getCertificate } from "@/lib/certificates/settings";
import { clientIp, consume } from "@/lib/security/rate-limit";

/**
 * Certificat (PNG) d'une stratégie validée. Son auteur, l'équipe et les admins
 * le voient toujours ; les autres seulement s'il est affiché sur le profil public
 * (et que le pseudo de l'auteur leur est visible). `?download=1` : téléchargement.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  const certificate = await getCertificate((await params).id);
  if (!certificate || !(await canViewCertificate(certificate, viewer))) {
    return NextResponse.json({ error: "Certificat introuvable." }, { status: 404 });
  }
  // le rendu coûte un peu de calcul (les images déjà rendues sont gardées en mémoire)
  const who = viewer ? `user:${viewer.id}` : `ip:${await clientIp(request.headers)}`;
  if (!(await consume(`certificate:${who}`, 120, 3600))) {
    return NextResponse.json({ error: "Trop de demandes, réessaie plus tard." }, { status: 429 });
  }

  const image = await certificateImage(certificate);
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="fleija-certificate.png"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
