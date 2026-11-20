"use client";

import { useActionState } from "react";
import { choosePseudo, type PseudoFormState } from "@/app/bienvenue/actions";
import styles from "./AuthPanel.module.css";

type PseudoFormProps = { callbackUrl: string; suggestion: string; submitLabel: string };

/** Champ « pseudo » de la page /bienvenue (premier choix ou changement). */
export function PseudoForm({ callbackUrl, suggestion, submitLabel }: PseudoFormProps) {
  const [state, action, pending] = useActionState<PseudoFormState, FormData>(
    choosePseudo.bind(null, callbackUrl),
    {},
  );

  return (
    <form action={action} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="pseudo">Pseudo</label>
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
            {state.error}
          </span>
        ) : (
          <span id="pseudo-help" className={styles.help}>
            Affiché sur tes propositions et tes recherches. 3 à 24 caractères, sans espace.
          </span>
        )}
      </div>
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Un instant…" : submitLabel}
      </button>
    </form>
  );
}
