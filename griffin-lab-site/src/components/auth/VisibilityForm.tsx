"use client";

import { useActionState } from "react";
import { setVisibilityAction } from "@/app/account/actions";
import styles from "@/app/account/account.module.css";
import { Button } from "@/components/ui/Button";
import { useLocale, useMessage } from "@/components/i18n/LocaleProvider";
import { PROFILE_VISIBILITIES, visibilityChoices, visibilityChoicesEn, type ProfileVisibility } from "@/lib/users/visibility-choices";

/** Choix de l'anonymat sur /account. */
export function VisibilityForm({ current }: { current: ProfileVisibility }) {
  const [state, action, pending] = useActionState(setVisibilityAction, {});
  const locale = useLocale();
  const message = useMessage();
  const choices = locale === "en" ? visibilityChoicesEn : visibilityChoices;
  return (
    <form action={action} className={styles.visibility} id="visibility">
      <fieldset>
        <legend>{locale === "en" ? "Who sees my username and profile?" : "Qui voit mon pseudo et mon profil ?"}</legend>
        {PROFILE_VISIBILITIES.map((value) => (
          <label key={value} className={styles.choice}>
            <input type="radio" name="visibility" value={value} defaultChecked={current === value} />
            <span>
              <b>{choices[value].label}</b>
              <small>{choices[value].help}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={styles.visibilityFoot}>
        <Button type="submit" size="sm" variant="glass" disabled={pending}>
          {pending ? "…" : locale === "en" ? "Save" : "Enregistrer"}
        </Button>
        {state.message && <span className={state.ok ? styles.saved : styles.failed}>{message(state.message)}</span>}
      </div>
    </form>
  );
}
