"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { AuthFormState, CodeFormState } from "@/app/sign-in/actions";
import { requestPasswordReset, resetPasswordWithLinkAction } from "@/app/forgot-password/actions";
import { useMessage, useT } from "@/components/i18n/LocaleProvider";
import styles from "./CodeForm.module.css";

/** Nouveau mot de passe + confirmation, avec bouton « afficher ». */
export function PasswordFields() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const type = visible ? "text" : "password";
  return (
    <div className={styles.passwords}>
      <div className={styles.emailField}>
        <label htmlFor="new-password">{t("Nouveau mot de passe", "New password")}</label>
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
            {visible ? t("Masquer", "Hide") : t("Afficher", "Show")}
          </button>
        </div>
        <span className={styles.help}>{t("8 caractères minimum.", "At least 8 characters.")}</span>
      </div>
      <div className={styles.emailField}>
        <label htmlFor="confirm-password">{t("Confirme le mot de passe", "Confirm the password")}</label>
        <input id="confirm-password" name="confirm" type={type} autoComplete="new-password" required />
      </div>
    </div>
  );
}

/** Étape 1 : l'adresse du compte. */
export function RequestResetForm({ email }: { email?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, {});
  const t = useT();
  const message = useMessage();
  return (
    <form action={action} className={styles.form}>
      <div className={styles.emailField}>
        <label htmlFor="reset-email">{t("Adresse e-mail du compte", "Account email address")}</label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={state.values?.email ?? email}
          placeholder={t("toi@exemple.com", "you@example.com")}
        />
      </div>
      {state.error && (
        <p className={styles.error} role="alert">
          {message(state.error)}
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t("Envoi…", "Sending…") : t("Recevoir un code", "Get a code")}
      </button>
    </form>
  );
}

/** Arrivée par le lien de l'e-mail : seulement le nouveau mot de passe. */
export function ResetLinkForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<CodeFormState, FormData>(resetPasswordWithLinkAction.bind(null, token), {});
  const t = useT();
  const message = useMessage();
  return (
    <form action={action} className={styles.form}>
      <PasswordFields />
      {state.error && (
        <p className={styles.error} role="alert">
          {message(state.error)} {state.expired && <Link href="/forgot-password?change=1">{t("Recommencer", "Start over")}</Link>}
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t("Un instant…", "One moment…") : t("Changer mon mot de passe", "Change my password")}
      </button>
    </form>
  );
}
