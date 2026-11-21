import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DIVERSIFICATION_YEARS, diversificationSeries } from "@/lib/home/diversification";
import { DiversificationChart } from "./DiversificationChart";
import styles from "./Diversification.module.css";

/**
 * Section 05 : ce que le book ajoute à ta stratégie. Deux graphiques côte à
 * côte (un axe chacun) : rendement cumulé et drawdown pour 2, 5 et 10
 * stratégies, une couleur par nombre de stratégies.
 */

// palette catégorielle validée (daltonisme) : bleu, orange, aqua, dans cet ordre
const COLORS: Record<number, string> = { 2: "#3987e5", 5: "#d95926", 10: "#199e70" };

const pct = (value: number) =>
  `${value > 0 ? "+" : "−"}${Math.abs(value).toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`;

export function Diversification() {
  const returns = diversificationSeries.map((s) => ({ count: s.count, color: COLORS[s.count], values: s.returns }));
  const drawdown = diversificationSeries.map((s) => ({ count: s.count, color: COLORS[s.count], values: s.drawdown }));

  return (
    <Section id="diversification">
      <SectionHeading kicker="05 · Le book en plus" title="Ta stratégie, plus tout le book." align="center">
        Quand ta stratégie entre dans un book, elle n&apos;est plus seule : elle s&apos;ajoute à des stratégies peu
        corrélées. À risque égal, plus il y en a, plus le rendement monte et plus les pertes se réduisent.
      </SectionHeading>

      <ul className={styles.legend} aria-label="Légende">
        {diversificationSeries.map((s) => (
          <li key={s.count}>
            <i style={{ background: COLORS[s.count] }} aria-hidden="true" />
            <b>{s.count} stratégies</b>
            <span>
              {pct(s.finalReturn)} · drawdown max {pct(s.maxDrawdown)}
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.charts}>
        <DiversificationChart
          title="Rendement cumulé"
          series={returns}
          years={DIVERSIFICATION_YEARS}
          tick={20}
        />
        <DiversificationChart
          title="Drawdown"
          series={drawdown}
          years={DIVERSIFICATION_YEARS}
          tick={5}
        />
      </div>

    </Section>
  );
}
