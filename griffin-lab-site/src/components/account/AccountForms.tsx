"use client";

import { useActionState, useState } from "react";
import {
  changePasswordAction,
  changePseudoAction,
  deleteOwnAccountAction,
  type AccountFormState,
} from "@/app/compte/actions";
import styles from "@/app/compte/compte.module.css";
import { Button } from "@/components/ui/Button";

function Feedback({ state }: { state: AccountFormState }) {
  if (!state.message) return null;
  return (
    <span className={state.ok ? styles.saved : styles.failed} role={state.ok ? "status" : "alert"}>
      {state.message}
    </span>
  );
}

/** Pseudo affiché sur le site. */
export function PseudoForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(changePseudoAction, {});
  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span>Pseudo</span>
        <input
          name="pseudo"
          defaultValue={current}
          minLength={3}
          maxLength={24}
          autoComplete="nickname"
          required
          spellCheck={false}
        />
        <small>3 à 24 caractères : lettres, chiffres, « _ », « . » et « - ».</small>
      </label>
      <div className={styles.formFoot}>
        <Button type="submit" size="sm" variant="glass" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/** Changement de mot de passe (comptes e-mail). */
export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  const [visible, setVisible] = useState(false);
  const type = visible ? "text" : "password";
  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span>Mot de passe actuel</span>
        <input name="current" type={type} autoComplete="current-password" required />
      </label>
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span>Nouveau mot de passe</span>
          <input name="password" type={type} autoComplete="new-password" minLength={8} maxLength={200} required />
          <small>8 caractères minimum.</small>
        </label>
        <label className={styles.field}>
          <span>Confirme-le</span>
          <input name="confirm" type={type} autoComplete="new-password" required />
        </label>
      </div>
      <div className={styles.formFoot}>
        <Button type="submit" size="sm" variant="glass" disabled={pending}>
          {pending ? "…" : "Changer le mot de passe"}
        </Button>
        <button type="button" className={styles.linkButton} onClick={() => setVisible(!visible)} aria-pressed={visible}>
          {visible ? "Masquer" : "Afficher"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/** Suppression définitive : on retape son pseudo (et son mot de passe pour un compte e-mail). */
export function DeleteAccountForm({ pseudo, needsPassword }: { pseudo: string; needsPassword: boolean }) {
  const [state, action, pending] = useActionState(deleteOwnAccountAction, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className={styles.dangerButton} onClick={() => setOpen(true)}>
        Supprimer mon compte…
      </button>
    );
  }

  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span>
          Recopie ton pseudo <b>{pseudo}</b> pour confirmer
        </span>
        <input name="confirm" autoComplete="off" spellCheck={false} required />
      </label>
      {needsPassword && (
        <label className={styles.field}>
          <span>Mot de passe</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
      )}
      <div className={styles.formFoot}>
        <button type="submit" className={styles.dangerButton} disabled={pending}>
          {pending ? "Suppression…" : "Supprimer définitivement"}
        </button>
        <button type="button" className={styles.linkButton} onClick={() => setOpen(false)}>
          Annuler
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
