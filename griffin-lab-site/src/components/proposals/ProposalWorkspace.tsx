"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { fetchProposals } from "@/lib/proposals/client";
import type { PublicProposal } from "@/lib/proposals/types";
import { ProposalForm } from "./ProposalForm";
import { ProposalQueue } from "./ProposalQueue";
import styles from "./ProposalWorkspace.module.css";

/** Page Proposer : formulaire à gauche, propositions de l'utilisateur connecté à droite. */
export function ProposalWorkspace({ defaultPseudo }: { defaultPseudo: string }) {
  const t = useT();
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
          <li>
            {t(
              "Ta proposition entre dans la file avec le statut « En file ».",
              "Your submission joins the queue with the status “Queued”.",
            )}
          </li>
          <li>
            {t(
              "Elle passe les sept contrôles du script de test : statut « En test ».",
              "It goes through the seven checks of the test script: status “Testing”.",
            )}
          </li>
          <li>
            {t(
              "Validée : elle entre dans un book et tu débloques 100 % du bot. Rejetée : tu reçois la raison et tu peux la renvoyer.",
              "Validated: it joins a book and you unlock 100% of the bot. Rejected: you get the reason and can resubmit it.",
            )}
          </li>
        </ol>
      </div>
    </div>
  );
}
