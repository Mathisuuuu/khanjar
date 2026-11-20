import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModerationPanel } from "@/components/proposals/ModerationPanel";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = {
  title: "Modération",
  robots: { index: false, follow: false },
};

export default async function ModerationPage() {
  // un administrateur connecté modère sans jeton ; sinon, le jeton ADMIN_TOKEN reste possible
  const viewer = await getViewer();

  return (
    <>
      <PageHeader crumb="Modération" title="Modération">
        Change le statut des propositions, donne un score et la raison d&apos;un rejet.
      </PageHeader>
      <div className="container" style={{ paddingBottom: 96 }}>
        <ModerationPanel sessionAdmin={!!viewer?.isAdmin} />
      </div>
    </>
  );
}
