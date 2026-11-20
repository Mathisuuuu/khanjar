"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { AuthFormState, CodeFormState } from "@/app/connexion/actions";
import { requestPasswordReset, resetPasswordWithLinkAction } from "@/app/mot-de-passe-oublie/actions";
import styles from "./CodeForm.module.css";

/** Nouveau mot de passe + confirmation, avec bouton « afficher ». */
export function PasswordFields() {
  const [visible, setVisible] = useState(false);
  const type = visible ? "text" : "password";
  return (
    <div className={styles.passwords}>
      <div className={styles.emailField}>
        <label htmlFor="new-password">Nouveau mot de passe</label>
        <div className={styles.passwordRow}>
          <input
            id="new-password"
            name="password"
            type={type}
            autoComplete="new-password"
            minLength={8}
            maxLength={200}
            required
            data-after-code
          />
          <button type="button" onClick={() => setVisible(!visible)} aria-pressed={visible}>
            {visible ? "Masquer" : "Afficher"}
          </button>
        </div>
        <span className={styles.help}>8 caractères minimum.</span>
      </div>
      <div className={styles.emailField}>
        <label htmlFor="confirm-password">Confirme le mot de passe</label>
        <input id="confirm-password" name="confirm" type={type} autoComplete="new-password" required />
      </div>
    </div>
  );
}

/** Étape 1 : l'adresse du compte. */
export function RequestResetForm({ email }: { email?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, {});
  return (
    <form action={action} className={styles.form}>
      <div className={styles.emailField}>
        <label htmlFor="reset-email">Adresse e-mail du compte</label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={state.values?.email ?? email}
          placeholder="toi@exemple.com"
        />
      </div>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Envoi…" : "Recevoir un code"}
      </button>
    </form>
  );
}

/** Arrivée par le lien de l'e-mail : seulement le nouveau mot de passe. */
export function ResetLinkForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<CodeFormState, FormData>(resetPasswordWithLinkAction.bind(null, token), {});
  return (
    <form action={action} className={styles.form}>
      <PasswordFields />
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error} {state.expired && <Link href="/mot-de-passe-oublie?changer=1">Recommencer</Link>}
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Un instant…" : "Changer mon mot de passe"}
      </button>
    </form>
  );
}
