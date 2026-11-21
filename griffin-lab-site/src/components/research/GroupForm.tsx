"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/app/recherches/actions";
import type { GroupKind, Visibility } from "@/lib/research/types";
import { useMessage, useT } from "@/components/i18n/LocaleProvider";
import type { T } from "@/lib/i18n/core";
import styles from "./Research.module.css";

type GroupFormProps = {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  initial?: { name: string; description: string; visibility: Visibility };
  /** Affiche le choix « Griffin Lab / Communauté » (membres de l'équipe uniquement). */
  canChooseKind?: boolean;
  submitLabel: string;
};

const visibilityOptions = (t: T): { value: Visibility; label: string; help: string }[] => [
  { value: "public", label: "Public", help: t("Visible par tout le monde.", "Visible to everyone.") },
  { value: "private", label: t("Privé", "Private"), help: t("Toi et les membres invités.", "You and invited members.") },
];

const kindOptions = (t: T): { value: GroupKind; label: string; help: string }[] => [
  { value: "official", label: "Griffin Lab", help: t("Recherche officielle de l'équipe.", "Official team research.") },
  { value: "community", label: t("Communauté", "Community"), help: t("Recherche personnelle partagée.", "Shared personal research.") },
];

/** Création d'un groupe et réglages (nom, description, visibilité). */
export function GroupForm({ action, initial, canChooseKind, submitLabel }: GroupFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const values: Record<string, string | undefined> = { ...initial, ...state.values };
  const errors = state.fieldErrors ?? {};
  const t = useT();
  const message = useMessage();

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="group-name">
          {t("Nom du groupe", "Group name")}
        </label>
        <input
          id="group-name"
          name="name"
          required
          maxLength={80}
          defaultValue={values.name}
          aria-invalid={!!errors.name}
          placeholder={t("Ex. Momentum intraday sur le BTC", "e.g. Intraday momentum on BTC")}
        />
        {errors.name && <span className={styles.error}>{message(errors.name)}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="group-description">
          Description
        </label>
        <textarea
          id="group-description"
          name="description"
          maxLength={600}
          defaultValue={values.description}
          aria-invalid={!!errors.description}
          placeholder={t("Le sujet, les questions étudiées, ce que les membres peuvent partager.", "The topic, the questions studied, what members can share.")}
        />
        {errors.description && <span className={styles.error}>{message(errors.description)}</span>}
      </div>

      {canChooseKind && (
        <RadioGroup name="kind" legend={t("Type de recherche", "Research type")} options={kindOptions(t)} value={values.kind ?? "community"} />
      )}

      <RadioGroup
        name="visibility"
        legend={t("Visibilité", "Visibility")}
        options={visibilityOptions(t)}
        value={values.visibility ?? "public"}
        error={message(errors.visibility)}
      />

      <div className={styles.formActions}>
        <Button type="submit" disabled={pending}>
          {pending ? t("Enregistrement…", "Saving…") : submitLabel}
        </Button>
        {state.message && (
          <span className={state.ok ? styles.success : styles.error} role="status">
            {message(state.message)}
          </span>
        )}
      </div>
    </form>
  );
}

type RadioGroupProps = {
  name: string;
  legend: string;
  options: { value: string; label: string; help: string }[];
  value: string;
  error?: string;
};

/**
 * Choix exclusif non contrôlé : React réinitialise le formulaire après chaque
 * action, `defaultChecked` garde alors la valeur renvoyée par le serveur.
 * Le style « coché » vient de `:has(input:checked)` dans le CSS.
 */
function RadioGroup({ name, legend, options, value, error }: RadioGroupProps) {
  return (
    <fieldset className={styles.field}>
      <legend className={styles.label}>{legend}</legend>
      <div className={`${styles.segmented} ${styles.segmented2}`}>
        {options.map((option) => (
          <label key={option.value}>
            <input type="radio" name={name} value={option.value} defaultChecked={value === option.value} />
            {option.label}
            <small>{option.help}</small>
          </label>
        ))}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </fieldset>
  );
}
