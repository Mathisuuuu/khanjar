"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  resendVerification,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
  type AuthFormState,
} from "@/app/connexion/actions";
import { Mascot } from "@/components/ui/Mascot";
import { BrandIcon } from "@/components/ui/BrandIcon";
import type { OAuthProviderId } from "@/lib/auth-providers";
import styles from "./AuthPanel.module.css";

type ProviderOption = { id: OAuthProviderId; label: string; enabled: boolean };
type Mode = "signin" | "signup";

/**
 * Carte de connexion : Discord en premier (mis en avant), puis Google et Apple,
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
  const [mode, setMode] = useState<Mode>("signin");
  const [discord, ...others] = providers;
  const proposing = callbackUrl === "/proposer";

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <Mascot width={34} />
        <h1>{mode === "signin" ? "Content de te revoir" : "Crée ton compte"}</h1>
        <p>
          {proposing
            ? "Connecte-toi pour proposer ta stratégie."
            : "Pour proposer tes stratégies et suivre leur statut."}
        </p>
      </div>

      {verified && (
        <p className={styles.notice} role="status">
          Adresse confirmée ! Tu peux maintenant te connecter.
        </p>
      )}
      {reset && (
        <p className={styles.notice} role="status">
          Mot de passe changé ! Connecte-toi avec le nouveau.
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
        <span>ou avec ton e-mail</span>
      </div>

      {/* la clé remet le formulaire à zéro quand on change de mode */}
      <EmailForm key={mode} mode={mode} callbackUrl={callbackUrl} />

      <p className={styles.switch}>
        {mode === "signin" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Créer un compte" : "Se connecter"}
        </button>
      </p>

      <p className={styles.legal}>
        En continuant, tu acceptes les <Link href="/regles">règles de contribution</Link>.
      </p>
    </div>
  );
}

type ProviderButtonProps = { provider: ProviderOption; callbackUrl: string; featured?: boolean };

function ProviderButton({ provider, callbackUrl, featured = false }: ProviderButtonProps) {
  const action = signInWithProvider.bind(null, provider.id, callbackUrl);
  return (
    <form action={action} className={featured ? styles.featuredForm : undefined}>
      <button
        type="submit"
        disabled={!provider.enabled}
        title={provider.enabled ? undefined : `Connexion ${provider.label} pas encore configurée`}
        className={`glass ${styles.provider} ${featured ? styles.discord : ""}`}
      >
        <BrandIcon name={provider.id} size={featured ? 22 : 18} />
        {featured ? `Continuer avec ${provider.label}` : provider.label}
      </button>
    </form>
  );
}

const initialState: AuthFormState = {};

function EmailForm({ mode, callbackUrl }: { mode: Mode; callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(mode === "signin" ? signInWithEmail : signUpWithEmail, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {mode === "signup" && (
        <Field
          name="name"
          label="Pseudo"
          autoComplete="nickname"
          defaultValue={state.values?.name}
          error={errors.name}
          help="Affiché sur le site. 3 à 24 caractères, sans espace."
        />
      )}
      <Field
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={errors.email}
      />
      <Field
        name="password"
        label="Mot de passe"
        type="password"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        error={errors.password}
        help={mode === "signup" ? "8 caractères minimum." : undefined}
      />
      {mode === "signin" && (
        <Link href="/mot-de-passe-oublie" className={styles.forgot}>
          Mot de passe oublié ?
        </Link>
      )}

      {state.error && (
        <p className={styles.formError} role="alert">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className={styles.notice} role="status">
          {state.notice}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Un instant…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
      </button>

      {state.unverifiedEmail && <ResendButton email={state.unverifiedEmail} />}
    </form>
  );
}

/** « Renvoyer l'e-mail » : formulaire séparé (un formulaire ne peut pas en contenir un autre, d'où formAction). */
function ResendButton({ email }: { email: string }) {
  const [state, resendAction, pending] = useActionState(resendVerification, initialState);
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
        {pending ? "Envoi…" : "Renvoyer l'e-mail de confirmation"}
      </button>
      {(state.notice || state.error) && (
        <span role="status" className={state.error ? styles.error : styles.help}>
          {state.notice ?? state.error}
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
