"use client";

import { useActionState } from "react";
import { choosePseudo, type PseudoFormState } from "@/app/welcome/actions";
import { useMessage, useT } from "@/components/i18n/LocaleProvider";
import styles from "./AuthPanel.module.css";

type PseudoFormProps = { callbackUrl: string; suggestion: string; submitLabel: string };

/** Champ « pseudo » de la page /welcome (premier choix ou changement). */
export function PseudoForm({ callbackUrl, suggestion, submitLabel }: PseudoFormProps) {
  const [state, action, pending] = useActionState<PseudoFormState, FormData>(
    choosePseudo.bind(null, callbackUrl),
    {},
  );
  const t = useT();
  const message = useMessage();

  return (
    <form action={action} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="pseudo">{t("Pseudo", "Username")}</label>
        <input
          id="pseudo"
          name="pseudo"
          autoComplete="nickname"
          defaultValue={state.value ?? suggestion}
          maxLength={24}
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "pseudo-error" : "pseudo-help"}
        />
        {state.error ? (
          <span id="pseudo-error" className={styles.error}>
            {message(state.error)}
          </span>
        ) : (
          <span id="pseudo-help" className={styles.help}>
            {t(
              "Affiché sur tes propositions et tes recherches. 3 à 24 caractères, sans espace.",
              "Shown on your submissions and research. 3 to 24 characters, no spaces.",
            )}
          </span>
        )}
      </div>
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t("Un instant…", "One moment…") : submitLabel}
      </button>
    </form>
  );
}
