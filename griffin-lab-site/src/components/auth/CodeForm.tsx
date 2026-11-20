"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { resendVerification, verifyCode, type AuthFormState, type CodeFormState } from "@/app/connexion/actions";
import styles from "./CodeForm.module.css";

const LENGTH = 6;
const RESEND_DELAY = 60;

type Props = { email?: string };

/**
 * Six cases pour le code reçu par e-mail : saisie chiffre par chiffre,
 * collage du code entier, retour arrière, envoi automatique au 6e chiffre.
 */
export function CodeForm({ email: initialEmail }: Props) {
  const [state, action, pending] = useActionState<CodeFormState, FormData>(verifyCode, {});
  const [resendState, resendAction, resending] = useActionState<AuthFormState, FormData>(resendVerification, {});
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
    if (!state.error) return;
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
    if (next.every(Boolean) && email) requestAnimationFrame(() => form.current?.requestSubmit());
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
            <label htmlFor="verify-email">Adresse e-mail du compte</label>
            <input
              id="verify-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="toi@exemple.com"
            />
          </div>
        ) : (
          <>
            <input type="hidden" name="email" value={email} />
            <p className={styles.sentTo}>
              Code envoyé à <strong>{email}</strong>
              <button type="button" onClick={() => setEditingEmail(true)}>
                Modifier
              </button>
            </p>
          </>
        )}

        <input type="hidden" name="code" value={code} />
        <fieldset className={styles.boxes} disabled={pending}>
          <legend className={styles.srOnly}>Code de vérification à 6 chiffres</legend>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              className={`${styles.box} ${digit ? styles.filled : ""} ${state.error ? styles.shake : ""}`}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              pattern="[0-9]*"
              maxLength={index === 0 ? LENGTH : 1}
              aria-label={`Chiffre ${index + 1}`}
              aria-invalid={!!state.error}
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

        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={pending || code.length !== LENGTH || !email}>
          {pending ? "Vérification…" : "Valider le code"}
        </button>
      </form>

      <div className={styles.resend}>
        {resendState.notice && !resendState.error && (
          <p className={styles.notice} role="status">
            Nouveau code envoyé. Pense à regarder dans les spams.
          </p>
        )}
        {resendState.error && (
          <p className={styles.error} role="alert">
            {resendState.error}
          </p>
        )}
        <p>
          Rien reçu ?{" "}
          <button type="button" onClick={resend} disabled={resending || cooldown > 0 || !email}>
            {resending ? "Envoi…" : cooldown > 0 ? `Renvoyer dans ${cooldown} s` : "Renvoyer un code"}
          </button>
        </p>
      </div>
    </div>
  );
}
