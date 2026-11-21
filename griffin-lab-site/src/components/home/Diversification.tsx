import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DIVERSIFICATION_YEARS, diversificationSeries } from "@/lib/home/diversification";
import { DiversificationChart } from "./DiversificationChart";
import { intlLocale } from "@/lib/i18n/core";
import { getLocale } from "@/lib/i18n/server";
import styles from "./Diversification.module.css";

/**
 * Section 05 : ce que le book ajoute à ta stratégie. Deux graphiques côte à
 * côte (un axe chacun) : rendement cumulé et drawdown pour 2, 5 et 10
 * stratégies, une couleur par nombre de stratégies.
 */

// palette catégorielle validée (daltonisme) : bleu, orange, aqua, dans cet ordre
const COLORS: Record<number, string> = { 2: "#3987e5", 5: "#d95926", 10: "#199e70" };

export async function Diversification() {
  const locale = await getLocale();
  const t = <A,>(fr: A, en: A) => (locale === "en" ? en : fr);
  const pct = (value: number) =>
    `${value > 0 ? "+" : "−"}${Math.abs(value).toLocaleString(intlLocale(locale), { maximumFractionDigits: 1, minimumFractionDigits: 1 })}${locale === "en" ? "%" : " %"}`;
  const returns = diversificationSeries.map((s) => ({ count: s.count, color: COLORS[s.count], values: s.returns }));
  const drawdown = diversificationSeries.map((s) => ({ count: s.count, color: COLORS[s.count], values: s.drawdown }));

  return (
    <Section id="diversification">
      <SectionHeading
        kicker={t("05 · Le book en plus", "05 · The book on top")}
        title={t("Ta stratégie, plus tout le book.", "Your strategy, plus the whole book.")}
        align="center"
      >
        {t(
          "Quand ta stratégie entre dans un book, elle n'est plus seule : elle s'ajoute à des stratégies peu corrélées. À risque égal, plus il y en a, plus le rendement monte et plus les pertes se réduisent.",
          "When your strategy joins a book, it is no longer alone: it adds to weakly correlated strategies. At equal risk, the more there are, the higher the return and the smaller the losses.",
        )}
      </SectionHeading>

      <ul className={styles.legend} aria-label={t("Légende", "Legend")}>
        {diversificationSeries.map((s) => (
          <li key={s.count}>
            <i style={{ background: COLORS[s.count] }} aria-hidden="true" />
            <b>
              {s.count} {t("stratégies", "strategies")}
            </b>
            <span>
              {pct(s.finalReturn)} · {t("drawdown max", "max drawdown")} {pct(s.maxDrawdown)}
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.charts}>
        <DiversificationChart
          title={t("Rendement cumulé", "Cumulative return")}
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
