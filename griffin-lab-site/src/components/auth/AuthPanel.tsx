"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  resendVerification,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
  type AuthFormState,
} from "@/app/sign-in/actions";
import { useMessage, useT } from "@/components/i18n/LocaleProvider";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { Minitel } from "@/components/ui/Minitel";
import type { OAuthProviderId } from "@/lib/auth/providers";
import styles from "./AuthPanel.module.css";

type ProviderOption = { id: OAuthProviderId; label: string; enabled: boolean };
type Mode = "signin" | "signup";

/**
 * Carte de connexion : Discord en premier (mis en avant), puis Google,
 * puis e-mail + mot de passe avec bascule « se connecter / créer un compte ».
 */
type AuthPanelProps = {
  providers: ProviderOption[];
  callbackUrl: string;
  /** Arrivée depuis le lien de confirmation : adresse vérifiée. */
  verified?: boolean;
  /** Arrivée après « mot de passe oublié » : mot de passe changé. */
  reset?: boolean;
};

export function AuthPanel({ providers, callbackUrl, verified = false, reset = false }: AuthPanelProps) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("signin");
  const [discord, ...others] = providers;
  const proposing = callbackUrl === "/submit";

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <Minitel width={40} auto />
        <h1>{mode === "signin" ? t("Content de te revoir", "Welcome back") : t("Crée ton compte", "Create your account")}</h1>
        <p>
          {proposing
            ? t("Connecte-toi pour proposer ta stratégie.", "Sign in to submit your strategy.")
            : t("Pour proposer tes stratégies et suivre leur statut.", "To submit your strategies and follow their status.")}
        </p>
      </div>

      {verified && (
        <p className={styles.notice} role="status">
          {t("Adresse confirmée ! Tu peux maintenant te connecter.", "Email confirmed! You can now sign in.")}
        </p>
      )}
      {reset && (
        <p className={styles.notice} role="status">
          {t("Mot de passe changé ! Connecte-toi avec le nouveau.", "Password changed! Sign in with the new one.")}
        </p>
      )}

      <div className={styles.providers}>
        <ProviderButton provider={discord} callbackUrl={callbackUrl} featured />
        <div className={styles.row}>
          {others.map((provider) => (
            <ProviderButton key={provider.id} provider={provider} callbackUrl={callbackUrl} />
          ))}
        </div>
      </div>

      <div className={styles.separator}>
        <span>{t("ou avec ton e-mail", "or with your email")}</span>
      </div>

      {/* la clé remet le formulaire à zéro quand on change de mode */}
      <EmailForm key={mode} mode={mode} callbackUrl={callbackUrl} />

      <p className={styles.switch}>
        {mode === "signin" ? t("Pas encore de compte ?", "No account yet?") : t("Déjà un compte ?", "Already have an account?")}{" "}
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? t("Créer un compte", "Create an account") : t("Se connecter", "Sign in")}
        </button>
      </p>

      <p className={styles.legal}>
        {t(
          <>
            En continuant, tu acceptes les <Link href="/about#rules">règles de contribution</Link>.
          </>,
          <>
            By continuing, you accept the <Link href="/about#rules">contribution rules</Link>.
          </>,
        )}
      </p>
    </div>
  );
}

type ProviderButtonProps = { provider: ProviderOption; callbackUrl: string; featured?: boolean };

function ProviderButton({ provider, callbackUrl, featured = false }: ProviderButtonProps) {
  const t = useT();
  const action = signInWithProvider.bind(null, provider.id, callbackUrl);
  return (
    <form action={action} className={featured ? styles.featuredForm : undefined}>
      <button
        type="submit"
        disabled={!provider.enabled}
        title={provider.enabled ? undefined : t(`Connexion ${provider.label} pas encore configurée`, `${provider.label} sign-in not set up yet`)}
        className={`glass ${styles.provider} ${featured ? styles.discord : ""}`}
      >
        <BrandIcon name={provider.id} size={featured ? 22 : 18} />
        {featured ? t(`Continuer avec ${provider.label}`, `Continue with ${provider.label}`) : provider.label}
      </button>
    </form>
  );
}

const initialState: AuthFormState = {};

function EmailForm({ mode, callbackUrl }: { mode: Mode; callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(mode === "signin" ? signInWithEmail : signUpWithEmail, initialState);
  const errors = state.fieldErrors ?? {};
  const t = useT();
  const message = useMessage();

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {mode === "signup" && (
        <Field
          name="name"
          label={t("Pseudo", "Username")}
          autoComplete="nickname"
          defaultValue={state.values?.name}
          error={message(errors.name)}
          help={t("Affiché sur le site. 3 à 24 caractères, sans espace.", "Shown on the site. 3 to 24 characters, no spaces.")}
        />
      )}
      <Field
        name="email"
        label={t("E-mail", "Email")}
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={message(errors.email)}
      />
      <Field
        name="password"
        label={t("Mot de passe", "Password")}
        type="password"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        error={message(errors.password)}
        help={mode === "signup" ? t("8 caractères minimum.", "At least 8 characters.") : undefined}
      />
      {mode === "signin" && (
        <Link href="/forgot-password" className={styles.forgot}>
          {t("Mot de passe oublié ?", "Forgot your password?")}
        </Link>
      )}

      {state.error && (
        <p className={styles.formError} role="alert">
          {message(state.error)}
        </p>
      )}
      {state.notice && (
        <p className={styles.notice} role="status">
          {message(state.notice)}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? t("Un instant…", "One moment…") : mode === "signin" ? t("Se connecter", "Sign in") : t("Créer mon compte", "Create my account")}
      </button>

      {state.unverifiedEmail && <ResendButton email={state.unverifiedEmail} />}
    </form>
  );
}

/** « Renvoyer l'e-mail » : formulaire séparé (un formulaire ne peut pas en contenir un autre, d'où formAction). */
function ResendButton({ email }: { email: string }) {
  const [state, resendAction, pending] = useActionState(resendVerification, initialState);
  const t = useT();
  const message = useMessage();
  return (
    <div className={styles.resend}>
      <button
        type="submit"
        formAction={(data) => {
          data.set("email", email);
          resendAction(data);
        }}
        disabled={pending}
      >
        {pending ? t("Envoi…", "Sending…") : t("Renvoyer l'e-mail de confirmation", "Resend the confirmation email")}
      </button>
      {(state.notice || state.error) && (
        <span role="status" className={state.error ? styles.error : styles.help}>
          {message(state.notice ?? state.error)}
        </span>
      )}
    </div>
  );
}

type FieldProps = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  help?: string;
};

function Field({ name, label, type = "text", autoComplete, defaultValue, error, help }: FieldProps) {
  const describedBy = error ? `${name}-error` : help ? `${name}-help` : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <span id={`${name}-error`} className={styles.error}>
          {error}
        </span>
      ) : (
        help && (
          <span id={`${name}-help`} className={styles.help}>
            {help}
          </span>
        )
      )}
    </div>
  );
}
