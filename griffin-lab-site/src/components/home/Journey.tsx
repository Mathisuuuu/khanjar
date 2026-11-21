import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getT } from "@/lib/i18n/server";
import styles from "./Journey.module.css";

/** Schéma du parcours d'une proposition, du dépôt à l'accès complet. */
export async function Journey() {
  const t = await getT();
  return (
    <Section id="parcours" tone="alt">
      <SectionHeading
        kicker={t("02 · Le parcours", "02 · The journey")}
        title={t(
          "Seules les stratégies qui passent le test entrent dans le bot.",
          "Only strategies that pass the test get into the bot.",
        )}
      >
        {t(
          "4 étapes, 1 décision. Et une proposition rejetée n'est jamais perdue.",
          "4 steps, 1 decision. And a rejected submission is never lost.",
        )}
      </SectionHeading>

      <div className={styles.frame}>
        <svg viewBox="0 16 960 254" role="img" aria-labelledby="journey-title">
          <title id="journey-title">
            {t(
              "Proposer, puis script de test, puis décision. Si validée : la stratégie entre dans un book peu corrélé, le bot s'améliore, et l'auteur obtient l'accès à 100 % du bot. Si rejetée : la raison est donnée, l'auteur peut l'améliorer et la renvoyer.",
              "Submit, then test script, then decision. If validated: the strategy joins a weakly correlated book, the bot improves, and the author gets access to 100% of the bot. If rejected: the reason is given, and the author can improve it and resubmit.",
            )}
          </title>
          <defs>
            <marker id="journey-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="#475569" />
            </marker>
            <marker id="journey-arrow-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="#22C55E" />
            </marker>
            <marker id="journey-arrow-ko" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="#EF4444" />
            </marker>
          </defs>
          <g textAnchor="middle">
            {/* Proposer */}
            <rect x="10" y="40" width="170" height="68" rx="12" fill="#111214" stroke="#334155" />
            <text x="95" y="79" fill="#F7F8F8" fontSize="15" fontWeight="600">{t("Proposer", "Submit")}</text>
            <line x1="182" y1="74" x2="228" y2="74" stroke="#475569" strokeWidth="1.5" markerEnd="url(#journey-arrow)" />

            {/* Script de test */}
            <rect x="232" y="40" width="180" height="68" rx="12" fill="#111214" stroke="#38BDF8" />
            <text x="322" y="79" fill="#F7F8F8" fontSize="15" fontWeight="600">{t("Script de test", "Test script")}</text>
            <line x1="414" y1="74" x2="462" y2="74" stroke="#475569" strokeWidth="1.5" markerEnd="url(#journey-arrow)" />

            {/* Décision */}
            <polygon points="535,24 605,74 535,124 465,74" fill="#111214" stroke="#8A8F98" />
            <text x="535" y="79" fill="#F7F8F8" fontSize="14" fontWeight="600">{t("Validé ?", "Validated?")}</text>

            {/* Oui */}
            <line className={styles.flowing} x1="607" y1="74" x2="700" y2="74" stroke="#22C55E" strokeWidth="1.5" markerEnd="url(#journey-arrow-ok)" />
            <text x="652" y="64" fill="#22C55E" fontSize="12" className={styles.mono}>{t("oui", "yes")}</text>
            <rect x="704" y="40" width="246" height="68" rx="12" fill="#111214" stroke="#22C55E" />
            <text x="827" y="79" fill="#F7F8F8" fontSize="15" fontWeight="600">{t("Entre dans un book", "Joins a book")}</text>
            <line className={styles.flowing} x1="827" y1="110" x2="827" y2="186" stroke="#22C55E" strokeWidth="1.5" markerEnd="url(#journey-arrow-ok)" />
            <rect x="704" y="190" width="246" height="72" rx="12" fill="rgba(34,197,94,.12)" stroke="#22C55E" strokeWidth="2" />
            <text x="827" y="231" fill="#4ADE80" fontSize="16" fontWeight="700">{t("Accès à 100 % du bot", "Access to 100% of the bot")}</text>

            {/* Non */}
            <line x1="535" y1="126" x2="535" y2="186" stroke="#EF4444" strokeWidth="1.5" markerEnd="url(#journey-arrow-ko)" />
            <text x="552" y="160" fill="#EF4444" fontSize="12" className={styles.mono} textAnchor="start">{t("non", "no")}</text>
            <rect x="440" y="190" width="190" height="72" rx="12" fill="#111214" stroke="#EF4444" />
            <text x="535" y="231" fill="#F7F8F8" fontSize="15" fontWeight="600">{t("Rejeté", "Rejected")}</text>

            {/* Retour */}
            <path d="M438 226 H95 V112" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="5 5" markerEnd="url(#journey-arrow)" />
          </g>
        </svg>
      </div>
    </Section>
  );
}
