import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProposalWorkspace } from "@/components/proposals/ProposalWorkspace";
import { getT } from "@/lib/i18n/server";
import { requireViewer } from "@/lib/auth/viewer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Proposer une stratégie", "Submit a strategy"),
    description: t(
      "Envoie une idée, un script ou un papier SSRN et suis son statut dans la file.",
      "Send an idea, a script or an SSRN paper and follow its status in the queue.",
    ),
  };
}

export default async function SubmitPage() {
  // proposer demande un compte et un pseudo : connexion (ou /welcome) puis retour ici
  const viewer = await requireViewer("/submit");
  const t = await getT();

  return (
    <>
      <PageHeader crumb={t("Proposer", "Submit")} title={t("Proposer une stratégie", "Submit a strategy")}>
        {t(
          "Envoie une idée, un script ou un papier SSRN. Ta proposition rejoint la file, passe le script de test, et tu suis son statut ici.",
          "Send an idea, a script or an SSRN paper. Your submission joins the queue, goes through the test script, and you follow its status here.",
        )}
      </PageHeader>
      <div className="container" style={{ paddingBottom: 96 }}>
        <ProposalWorkspace defaultPseudo={viewer.name} />
      </div>
    </>
  );
}
