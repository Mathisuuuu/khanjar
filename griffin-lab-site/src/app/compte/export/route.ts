import { getAccountOverview } from "@/lib/account/overview";
import { consume } from "@/lib/rate-limit";
import { getViewer } from "@/lib/viewer";

/** « Télécharger mes données » : tout ce que Griffin Lab garde sur le compte, en JSON. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return new Response("Connexion requise.", { status: 401 });
  if (!(await consume(`export:${viewer.id}`, 10, 60 * 60))) return new Response("Trop de demandes.", { status: 429 });

  const data = await getAccountOverview(viewer);
  const body = {
    exportedAt: new Date().toISOString(),
    account: {
      pseudo: viewer.name,
      connexion: data.provider,
      email: data.email,
      emailVerifiedAt: data.emailVerifiedAt,
      memberSince: data.memberSince,
      visibility: data.visibility,
    },
    proposals: data.proposals,
    researchPosts: data.posts,
    books: data.books,
    likesGiven: data.likesGiven,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="griffin-lab-mes-donnees.json"`,
      "Cache-Control": "no-store",
    },
  });
}
