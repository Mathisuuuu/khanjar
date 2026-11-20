import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import styles from "./Journey.module.css";

/** Schéma du parcours d'une proposition, du dépôt à l'accès complet. */
export function Journey() {
  return (
    <Section id="parcours" tone="alt">
      <SectionHeading kicker="02 · Le parcours" title="Seules les stratégies qui passent le test entrent dans le bot.">
        4 étapes, 1 décision. Et une proposition rejetée n&apos;est jamais perdue.
      </SectionHeading>

      <div className={styles.frame}>
        <svg viewBox="0 0 960 300" role="img" aria-labelledby="journey-title">
          <title id="journey-title">
            Proposer, puis script de test, puis décision. Si validée : la stratégie entre dans un book peu corrélé,
            le bot s&apos;améliore, et l&apos;auteur obtient l&apos;accès à 100 % du bot. Si rejetée : la raison est
            donnée, l&apos;auteur peut l&apos;améliorer et la renvoyer.
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
            <text x="95" y="79" fill="#F7F8F8" fontSize="15" fontWeight="600">Proposer</text>
            <line x1="182" y1="74" x2="228" y2="74" stroke="#475569" strokeWidth="1.5" markerEnd="url(#journey-arrow)" />

            {/* Script de test */}
            <rect x="232" y="40" width="180" height="68" rx="12" fill="#111214" stroke="#38BDF8" />
            <text x="322" y="79" fill="#F7F8F8" fontSize="15" fontWeight="600">Script de test</text>
            <line x1="414" y1="74" x2="462" y2="74" stroke="#475569" strokeWidth="1.5" markerEnd="url(#journey-arrow)" />

            {/* Décision */}
            <polygon points="535,24 605,74 535,124 465,74" fill="#111214" stroke="#8A8F98" />
            <text x="535" y="79" fill="#F7F8F8" fontSize="14" fontWeight="600">Validé ?</text>

            {/* Oui */}
            <line className={styles.flowing} x1="607" y1="74" x2="700" y2="74" stroke="#22C55E" strokeWidth="1.5" markerEnd="url(#journey-arrow-ok)" />
            <text x="652" y="64" fill="#22C55E" fontSize="12" className={styles.mono}>oui</text>
            <rect x="704" y="40" width="246" height="68" rx="12" fill="#111214" stroke="#22C55E" />
            <text x="827" y="79" fill="#F7F8F8" fontSize="15" fontWeight="600">Entre dans un book</text>
            <line className={styles.flowing} x1="827" y1="110" x2="827" y2="186" stroke="#22C55E" strokeWidth="1.5" markerEnd="url(#journey-arrow-ok)" />
            <rect x="704" y="190" width="246" height="72" rx="12" fill="rgba(34,197,94,.12)" stroke="#22C55E" strokeWidth="2" />
            <text x="827" y="231" fill="#4ADE80" fontSize="16" fontWeight="700">Accès à 100 % du bot</text>

            {/* Non */}
            <line x1="535" y1="126" x2="535" y2="186" stroke="#EF4444" strokeWidth="1.5" markerEnd="url(#journey-arrow-ko)" />
            <text x="552" y="160" fill="#EF4444" fontSize="12" className={styles.mono} textAnchor="start">non</text>
            <rect x="440" y="190" width="190" height="72" rx="12" fill="#111214" stroke="#EF4444" />
            <text x="535" y="231" fill="#F7F8F8" fontSize="15" fontWeight="600">Rejeté</text>

            {/* Retour */}
            <path d="M438 226 H95 V112" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="5 5" markerEnd="url(#journey-arrow)" />
          </g>
        </svg>
      </div>
    </Section>
  );
}
