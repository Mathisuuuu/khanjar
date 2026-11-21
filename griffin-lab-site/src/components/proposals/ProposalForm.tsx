"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocale, useMessage } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { makeT } from "@/lib/i18n/core";
import { ApiError, submitProposal } from "@/lib/proposals/client";
import { fieldErrors, newProposalSchema } from "@/lib/proposals/schema";
import { MARKETS, marketLabel, type ProposalType, type PublicProposal } from "@/lib/proposals/types";
import panel from "./Panel.module.css";
import styles from "./ProposalForm.module.css";

type FormValues = {
  type: ProposalType;
  pseudo: string;
  market: string;
  title: string;
  description: string;
  code: string;
  paperTitle: string;
  paperAuthors: string;
  paperUrl: string;
  acceptRules: boolean;
};

const EMPTY: FormValues = {
  type: "idea",
  pseudo: "",
  market: MARKETS[0],
  title: "",
  description: "",
  code: "",
  paperTitle: "",
  paperAuthors: "",
  paperUrl: "",
  acceptRules: false,
};

const typeOptions = (t: ReturnType<typeof makeT>): { value: ProposalType; label: string; hint: string }[] => [
  { value: "idea", label: t("Idée", "Idea"), hint: t("quelques phrases", "a few sentences") },
  { value: "script", label: "Script", hint: t("déjà codé", "already coded") },
  { value: "paper", label: t("Papier SSRN", "SSRN paper"), hint: t("effet testable", "testable effect") },
];

/** Brouillon gardé dans ce navigateur, pour ne rien perdre en cas de rechargement. */
const DRAFT_KEY = "griffin-lab:brouillon";

type Message = { tone: "ok" | "error"; text: string } | null;

type ProposalFormProps = {
  onSubmitted: (proposal: PublicProposal) => void;
  /** Pseudo pré-rempli avec le nom du compte connecté. */
  defaultPseudo: string;
};

export function ProposalForm({ onSubmitted, defaultPseudo }: ProposalFormProps) {
  const locale = useLocale();
  const t = makeT(locale);
  const message_ = useMessage();
  const [values, setValues] = useState<FormValues>({ ...EMPTY, pseudo: defaultPseudo });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Message>(null);
  const [submitting, setSubmitting] = useState(false);

  // Restaure le brouillon au premier rendu côté client
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<FormValues> | null;
      // un brouillon sans pseudo ne doit pas effacer le nom du compte
      if (draft) setValues((v) => ({ ...v, ...draft, pseudo: draft.pseudo || v.pseudo, acceptRules: false }));
    } catch {
      // brouillon illisible : on repart de zéro
    }
  }, []);

  // Sauvegarde le brouillon (avec un léger délai)
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const { acceptRules: _accept, ...draft } = values;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // stockage indisponible : sans conséquence
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [values]);

  const update =
    (field: keyof FormValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const target = event.target;
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      setValues((v) => ({ ...v, [field]: value }));
      setErrors(({ [field]: _removed, ...rest }) => rest);
    };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    const parsed = newProposalSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setMessage({ tone: "error", text: t("Vérifie les champs indiqués.", "Check the highlighted fields.") });
      return;
    }

    setSubmitting(true);
    try {
      const proposal = await submitProposal(parsed.data);
      onSubmitted(proposal);
      setValues((v) => ({ ...EMPTY, pseudo: v.pseudo, market: v.market }));
      setErrors({});
      setMessage({
        tone: "ok",
        text: t(
          "Proposition envoyée. Elle apparaît dans « Mes propositions » avec le statut « En file ».",
          "Submission sent. It appears in “My submissions” with the status “Queued”.",
        ),
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        setMessage({ tone: "error", text: error.message });
      } else {
        setMessage({ tone: "error", text: t("Envoi impossible. Vérifie ta connexion et réessaie.", "Couldn't send. Check your connection and try again.") });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fieldError = (name: string) =>
    errors[name] ? (
      <span className={styles.error} id={`${name}-error`}>
        {message_(errors[name])}
      </span>
    ) : null;

  const describedBy = (name: string) => (errors[name] ? `${name}-error` : undefined);

  return (
    <form className={panel.panel} onSubmit={handleSubmit} noValidate>
      <div className={panel.head}>
        <h2>{t("Nouvelle proposition", "New submission")}</h2>
        <span className={panel.command}>$ griffin submit</span>
      </div>

      <div className={panel.body}>
        <fieldset className={styles.field}>
          <legend className={styles.label}>{t("Type de contribution", "Contribution type")}</legend>
          <div className={styles.segmented}>
            {typeOptions(t).map((option) => (
              <label key={option.value} className={values.type === option.value ? styles.checked : undefined}>
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={values.type === option.value}
                  onChange={update("type")}
                />
                {option.label}
                <small>{option.hint}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.twoColumns}>
          <div className={styles.field}>
            <label htmlFor="pseudo" className={styles.label}>{t("Pseudo", "Username")}</label>
            <input id="pseudo" type="text" maxLength={32} autoComplete="nickname" placeholder={t("ton pseudo Discord", "your Discord username")} value={values.pseudo} onChange={update("pseudo")} />
          </div>
          <div className={styles.field}>
            <label htmlFor="market" className={styles.label}>{t("Marché", "Market")}</label>
            <select id="market" value={values.market} onChange={update("market")}>
              {MARKETS.map((market) => (
                <option key={market} value={market}>
                  {marketLabel(market, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="title" className={styles.label}>{t("Titre", "Title")}</label>
          <input
            id="title"
            type="text"
            maxLength={90}
            required
            placeholder={t("ex. Rebond RSI 5 min à l'ouverture de New York", "e.g. 5-min RSI bounce at the New York open")}
            value={values.title}
            onChange={update("title")}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={describedBy("title")}
          />
          {fieldError("title")}
        </div>

        <div className={styles.field}>
          <label htmlFor="description" className={styles.label}>{t("Règle de la stratégie", "Strategy rule")}</label>
          <textarea
            id="description"
            maxLength={2000}
            required
            placeholder={t(
              "Quand entrer, quand sortir, sur quelle unité de temps. ex. Acheter NQ quand le RSI 5 min repasse au-dessus de 30 dans les 30 premières minutes de la séance de New York ; stop sous le plus bas de la bougie.",
              "When to enter, when to exit, on which timeframe. e.g. Buy NQ when the 5-min RSI crosses back above 30 in the first 30 minutes of the New York session; stop below the candle's low.",
            )}
            value={values.description}
            onChange={update("description")}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={describedBy("description")}
          />
          {fieldError("description") ?? <span className={styles.help}>{t("Décris les entrées, sorties et le stop. 2 000 caractères maximum.", "Describe the entries, exits and stop. 2,000 characters max.")}</span>}
        </div>

        {values.type === "script" && (
          <div className={styles.field}>
            <label htmlFor="code" className={styles.label}>{t("Code de la stratégie", "Strategy code")}</label>
            <textarea
              id="code"
              className={styles.code}
              maxLength={20000}
              spellCheck={false}
              placeholder={"def signal(bar):\n    if bar.rsi_5m > 30 and bar.ny_open:\n        return 'LONG'"}
              value={values.code}
              onChange={update("code")}
              aria-invalid={Boolean(errors.code)}
              aria-describedby={describedBy("code")}
            />
            {fieldError("code") ?? <span className={styles.help}>{t("Python, Pine Script ou pseudo-code. 20 000 caractères maximum. Le code n'est pas affiché publiquement.", "Python, Pine Script or pseudo-code. 20,000 characters max. The code is not shown publicly.")}</span>}
          </div>
        )}

        {values.type === "paper" && (
          <>
            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label htmlFor="paperTitle" className={styles.label}>{t("Titre du papier", "Paper title")}</label>
                <input id="paperTitle" type="text" maxLength={200} value={values.paperTitle} onChange={update("paperTitle")} aria-invalid={Boolean(errors.paperTitle)} aria-describedby={describedBy("paperTitle")} />
                {fieldError("paperTitle")}
              </div>
              <div className={styles.field}>
                <label htmlFor="paperAuthors" className={styles.label}>{t("Auteurs", "Authors")}</label>
                <input id="paperAuthors" type="text" maxLength={200} value={values.paperAuthors} onChange={update("paperAuthors")} />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="paperUrl" className={styles.label}>{t("Lien SSRN", "SSRN link")}</label>
              <input id="paperUrl" type="url" maxLength={300} placeholder="https://papers.ssrn.com/..." value={values.paperUrl} onChange={update("paperUrl")} aria-invalid={Boolean(errors.paperUrl)} aria-describedby={describedBy("paperUrl")} />
              {fieldError("paperUrl") ?? <span className={styles.help}>{t("Cite le titre et les auteurs ; ne copie pas le contenu du papier.", "Cite the title and authors; don't copy the paper's content.")}</span>}
            </div>
          </>
        )}

        <div>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={values.acceptRules} onChange={update("acceptRules")} aria-describedby={describedBy("acceptRules")} />
            <span>
              {t(
                <>
                  J&apos;ai lu les <Link href="/about#rules">règles de contribution</Link> et je comprends que les
                  résultats du test sont simulés.
                </>,
                <>
                  I have read the <Link href="/about#rules">contribution rules</Link> and understand that the test
                  results are simulated.
                </>,
              )}
            </span>
          </label>
          {fieldError("acceptRules")}
        </div>

        <div className={styles.footer}>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("Envoi…", "Sending…") : t("Envoyer la proposition", "Send submission")}
          </Button>
          <span role="status" aria-live="polite" className={message ? styles[message.tone] : styles.message}>
            {message_(message?.text)}
          </span>
        </div>
      </div>
    </form>
  );
}
