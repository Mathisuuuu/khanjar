import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PointerHighlight } from "@/components/ui/PointerHighlight";
import { contributions, type Contribution } from "@/content/home";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/shared/cn";
import styles from "./Concept.module.css";

/**
 * Section 01 : les trois façons de contribuer, en cartes « Pointer Highlight »
 * (Aceternity UI). Le mot-clé de chaque carte est encadré par un pointeur animé.
 * Les couleurs reprennent celles de la démo d'origine, carte par carte.
 */
const cardStyles: Record<
  Contribution["key"],
  { gradient: string; rectangle: string; pointer: string; container: string }
> = {
  idea: {
    gradient: "bg-linear-to-r from-blue-200 to-sky-200",
    rectangle: "bg-neutral-200 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 leading-loose",
    pointer: "text-yellow-500 h-3 w-3",
    container: "inline-block mr-1",
  },
  script: {
    gradient: "bg-linear-to-r from-blue-200 to-purple-200",
    rectangle: "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 leading-loose",
    pointer: "text-blue-500 h-3 w-3",
    container: "inline-block mx-1",
  },
  paper: {
    gradient: "bg-linear-45 from-green-200 to-yellow-200",
    rectangle: "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 leading-loose",
    pointer: "text-green-500 h-3 w-3",
    container: "inline-block ml-1",
  },
};

export async function Concept() {
  const t = await getT();
  return (
    <Section id="concept">
      <SectionHeading
        kicker={t("01 · Le concept", "01 · The concept")}
        title={t("Un bot qui ne dépend pas d'un seul trader.", "A bot that doesn't depend on a single trader.")}
      >
        {t(
          "Fleija s'enrichit des meilleures idées de sa communauté, toutes passées au même filtre automatique. Tu peux contribuer de trois façons, seules ou combinées.",
          "Fleija grows with the best ideas from its community, all run through the same automatic filter. You can contribute in three ways, alone or combined.",
        )}
      </SectionHeading>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {contributions(t).map((item) => {
          const style = cardStyles[item.key];
          return (
            <article key={item.key} className="rounded-md py-3 sm:p-6">
              {/* bandeau dégradé de la démo, avec l'exemple de contribution posé dessus.
                  Sur téléphone (cartes empilées) : bandeau masqué et espacements réduits pour tenir dans l'écran. */}
              <div className={cn("hidden h-40 w-full place-items-center rounded-lg p-4 sm:grid", style.gradient)}>
                <pre className={styles.snippet}>
                  {item.snippet.map((line, i) => (
                    <span key={i} className={styles.line}>
                      {line.map((token, j) => (
                        <span key={j} className={token.tone ? styles[token.tone] : undefined}>
                          {token.text}
                        </span>
                      ))}
                    </span>
                  ))}
                </pre>
              </div>
              <h3 className="mx-auto mt-0 max-w-lg sm:mt-4 text-base font-bold tracking-tight md:text-base">
                {/* pas d'espace autour du mot encadré : les marges de `container` (mr-1, mx-1, ml-1) s'en chargent */}
                {item.lead.before}
                <PointerHighlight
                  rectangleClassName={style.rectangle}
                  pointerClassName={style.pointer}
                  containerClassName={style.container}
                >
                  <span className="relative z-10">{item.lead.highlight}</span>
                </PointerHighlight>
                {item.lead.after}
              </h3>
              <p className="mt-2 text-sm text-neutral-500 sm:mt-4">{item.text}</p>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
