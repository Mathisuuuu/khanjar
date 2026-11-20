import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProposalWorkspace } from "@/components/proposals/ProposalWorkspace";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = {
  title: "Proposer une stratégie",
  description: "Envoie une idée, un script ou un papier SSRN et suis son statut dans la file.",
};

export default async function ProposerPage() {
  // proposer demande un compte et un pseudo : connexion (ou /bienvenue) puis retour ici
  const viewer = await requireViewer("/proposer");

  return (
    <>
      <PageHeader crumb="Proposer" title="Proposer une stratégie">
        Envoie une idée, un script ou un papier SSRN. Ta proposition rejoint la file, passe le script de test, et tu
        suis son statut ici.
      </PageHeader>
      <div className="container" style={{ paddingBottom: 96 }}>
        <ProposalWorkspace defaultPseudo={viewer.name} />
      </div>
    </>
  );
}
