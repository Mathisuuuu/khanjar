"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useMessage, useT } from "@/components/i18n/LocaleProvider";
import type { AuthFormState, CodeFormState } from "@/app/sign-in/actions";
import styles from "./CodeForm.module.css";

const LENGTH = 6;
const RESEND_DELAY = 60;

type Props = {
  email?: string;
  /** Action qui reçoit `email`, `code` et les champs de `children`. */
  action: (state: CodeFormState, formData: FormData) => Promise<CodeFormState>;
  /** Action « renvoyer un code » (reçoit `email`). */
  resend: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel?: string;
  /** Champs en plus sous le code (ex. nouveau mot de passe) ; désactive l'envoi automatique. */
  children?: ReactNode;
};

/**
 * Six cases pour le code reçu par e-mail : saisie chiffre par chiffre,
 * collage du code entier, retour arrière, envoi automatique au 6e chiffre
 * (sauf s'il reste des champs à remplir).
 */
export function CodeForm({ email: initialEmail, action: submit, resend: resendFn, submitLabel, children }: Props) {
  const t = useT();
  const message = useMessage();
  const [state, action, pending] = useActionState<CodeFormState, FormData>(submit, {});
  const [resendState, resendAction, resending] = useActionState<AuthFormState, FormData>(resendFn, {});
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(""));
  const [email, setEmail] = useState(initialEmail ?? "");
  const [editingEmail, setEditingEmail] = useState(!initialEmail);
  const [cooldown, setCooldown] = useState(initialEmail ? RESEND_DELAY : 0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const form = useRef<HTMLFormElement>(null);
  const code = digits.join("");

  useEffect(() => {
    if (!editingEmail) inputs.current[0]?.focus();
  }, [editingEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // après une erreur : on vide les cases et on revient à la première
  useEffect(() => {
    if (!state.error || state.keepCode) return;
    setDigits(Array(LENGTH).fill(""));
    inputs.current[0]?.focus();
  }, [state]);

  useEffect(() => {
    if (resendState.notice) {
      setCooldown(RESEND_DELAY);
      setDigits(Array(LENGTH).fill(""));
      inputs.current[0]?.focus();
    }
  }, [resendState]);

  function fill(from: number, value: string) {
    const chars = value.replace(/\D/g, "").slice(0, LENGTH - from).split("");
    if (chars.length === 0) return;
    const next = [...digits];
    chars.forEach((char, offset) => (next[from + offset] = char));
    setDigits(next);
    const last = Math.min(from + chars.length, LENGTH - 1);
    inputs.current[last]?.focus();
    if (!next.every(Boolean)) return;
    if (children) {
      // il reste des champs : on passe au premier
      requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>("[data-after-code]")?.focus());
    } else if (email) {
      requestAnimationFrame(() => form.current?.requestSubmit());
    }
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function onPaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    fill(index, event.clipboardData.getData("text"));
  }

  function resend() {
    const data = new FormData();
    data.set("email", email);
    startTransition(() => resendAction(data));
  }

  return (
    <div className={styles.wrap}>
      <form ref={form} action={action} className={styles.form}>
        {editingEmail ? (
          <div className={styles.emailField}>
            <label htmlFor="verify-email">{t("Adresse e-mail du compte", "Account email address")}</label>
            <input
              id="verify-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("toi@exemple.com", "you@example.com")}
            />
          </div>
        ) : (
          <>
            <input type="hidden" name="email" value={email} />
            <p className={styles.sentTo}>
              {t("Code envoyé à", "Code sent to")} <strong>{email}</strong>
              <button type="button" onClick={() => setEditingEmail(true)}>
                {t("Modifier", "Change")}
              </button>
            </p>
          </>
        )}

        <input type="hidden" name="code" value={code} />
        <fieldset className={styles.boxes} disabled={pending}>
          <legend className={styles.srOnly}>{t("Code de vérification à 6 chiffres", "6-digit verification code")}</legend>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              className={`${styles.box} ${digit ? styles.filled : ""} ${state.error && !state.keepCode ? styles.shake : ""}`}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              pattern="[0-9]*"
              maxLength={index === 0 ? LENGTH : 1}
              aria-label={t(`Chiffre ${index + 1}`, `Digit ${index + 1}`)}
              aria-invalid={!!state.error && !state.keepCode}
              value={digit}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "") {
                  const next = [...digits];
                  next[index] = "";
                  setDigits(next);
                } else {
                  // case déjà remplie, curseur après le chiffre : on garde la frappe nouvelle
                  fill(index, digit && value.length === 2 && value.startsWith(digit) ? value.slice(1) : value);
                }
              }}
              onKeyDown={(event) => onKeyDown(index, event)}
              onPaste={(event) => onPaste(index, event)}
              onFocus={(event) => event.target.select()}
            />
          ))}
        </fieldset>

        {children}

        {state.error && (
          <p className={styles.error} role="alert">
            {message(state.error)}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={pending || code.length !== LENGTH || !email}>
          {pending ? t("Un instant…", "One moment…") : (submitLabel ?? t("Valider le code", "Confirm code"))}
        </button>
      </form>

      <div className={styles.resend}>
        {resendState.notice && !resendState.error && (
          <p className={styles.notice} role="status">
            {t("Nouveau code envoyé. Pense à regarder dans les spams.", "New code sent. Remember to check your spam folder.")}
          </p>
        )}
        {resendState.error && (
          <p className={styles.error} role="alert">
            {message(resendState.error)}
          </p>
        )}
        <p>
          {t("Rien reçu ?", "Nothing received?")}{" "}
          <button type="button" onClick={resend} disabled={resending || cooldown > 0 || !email}>
            {resending
              ? t("Envoi…", "Sending…")
              : cooldown > 0
                ? t(`Renvoyer dans ${cooldown} s`, `Resend in ${cooldown}s`)
                : t("Renvoyer un code", "Resend a code")}
          </button>
        </p>
      </div>
    </div>
  );
}
