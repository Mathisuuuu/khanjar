"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchProposals } from "@/lib/proposals/client";
import type { PublicProposal } from "@/lib/proposals/types";
import { ProposalForm } from "./ProposalForm";
import { ProposalQueue } from "./ProposalQueue";
import styles from "./ProposalWorkspace.module.css";

/** Page Proposer : formulaire à gauche, propositions de l'utilisateur connecté à droite. */
export function ProposalWorkspace({ defaultPseudo }: { defaultPseudo: string }) {
  const [proposals, setProposals] = useState<PublicProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProposals(await fetchProposals());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmitted = (proposal: PublicProposal) => {
    setProposals((list) => [proposal, ...list]);
  };

  return (
    <div className={styles.grid}>
      <ProposalForm onSubmitted={handleSubmitted} defaultPseudo={defaultPseudo} />
      <div>
        <ProposalQueue proposals={proposals} loading={loading} error={error} />
        <ol className={styles.steps}>
          <li>Ta proposition entre dans la file avec le statut « En file ».</li>
          <li>Elle passe les cinq contrôles du script de test : statut « En test ».</li>
          <li>
            Validée : elle entre dans une boucle et tu débloques 100 % du bot. Rejetée : tu reçois la raison et tu peux
            la renvoyer.
          </li>
        </ol>
      </div>
    </div>
  );
}
