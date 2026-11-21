"use client";

import { useActionState, useState } from "react";
import {
  changePasswordAction,
  changePseudoAction,
  deleteOwnAccountAction,
  type AccountFormState,
} from "@/app/account/actions";
import styles from "@/app/account/account.module.css";
import { useMessage, useT } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";

function Feedback({ state }: { state: AccountFormState }) {
  const message = useMessage();
  if (!state.message) return null;
  return (
    <span className={state.ok ? styles.saved : styles.failed} role={state.ok ? "status" : "alert"}>
      {message(state.message)}
    </span>
  );
}

/** Pseudo affiché sur le site. */
export function PseudoForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(changePseudoAction, {});
  const t = useT();
  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span>{t("Pseudo", "Username")}</span>
        <input
          name="pseudo"
          defaultValue={current}
          minLength={3}
          maxLength={24}
          autoComplete="nickname"
          required
          spellCheck={false}
        />
        <small>{t("3 à 24 caractères : lettres, chiffres, « _ », « . » et « - ».", "3 to 24 characters: letters, digits, “_”, “.” and “-”.")}</small>
      </label>
      <div className={styles.formFoot}>
        <Button type="submit" size="sm" variant="glass" disabled={pending}>
          {pending ? "…" : t("Enregistrer", "Save")}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/** Changement de mot de passe (comptes e-mail). */
export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  const t = useT();
  const [visible, setVisible] = useState(false);
  const type = visible ? "text" : "password";
  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span>{t("Mot de passe actuel", "Current password")}</span>
        <input name="current" type={type} autoComplete="current-password" required />
      </label>
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span>{t("Nouveau mot de passe", "New password")}</span>
          <input name="password" type={type} autoComplete="new-password" minLength={8} maxLength={200} required />
          <small>{t("8 caractères minimum.", "At least 8 characters.")}</small>
        </label>
        <label className={styles.field}>
          <span>{t("Confirme-le", "Confirm it")}</span>
          <input name="confirm" type={type} autoComplete="new-password" required />
        </label>
      </div>
      <div className={styles.formFoot}>
        <Button type="submit" size="sm" variant="glass" disabled={pending}>
          {pending ? "…" : t("Changer le mot de passe", "Change password")}
        </Button>
        <button type="button" className={styles.linkButton} onClick={() => setVisible(!visible)} aria-pressed={visible}>
          {visible ? t("Masquer", "Hide") : t("Afficher", "Show")}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/** Suppression définitive : on retape son pseudo (et son mot de passe pour un compte e-mail). */
export function DeleteAccountForm({ pseudo, needsPassword }: { pseudo: string; needsPassword: boolean }) {
  const [state, action, pending] = useActionState(deleteOwnAccountAction, {});
  const t = useT();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className={styles.dangerButton} onClick={() => setOpen(true)}>
        {t("Supprimer mon compte…", "Delete my account…")}
      </button>
    );
  }

  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        <span>
          {t("Recopie ton pseudo", "Type your username")} <b>{pseudo}</b> {t("pour confirmer", "to confirm")}
        </span>
        <input name="confirm" autoComplete="off" spellCheck={false} required />
      </label>
      {needsPassword && (
        <label className={styles.field}>
          <span>{t("Mot de passe", "Password")}</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
      )}
      <div className={styles.formFoot}>
        <button type="submit" className={styles.dangerButton} disabled={pending}>
          {pending ? t("Suppression…", "Deleting…") : t("Supprimer définitivement", "Delete permanently")}
        </button>
        <button type="button" className={styles.linkButton} onClick={() => setOpen(false)}>
          {t("Annuler", "Cancel")}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
