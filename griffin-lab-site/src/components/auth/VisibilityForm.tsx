"use client";

import { useActionState } from "react";
import { setVisibilityAction } from "@/app/compte/actions";
import styles from "@/app/compte/compte.module.css";
import { Button } from "@/components/ui/Button";
import { PROFILE_VISIBILITIES, visibilityChoices, type ProfileVisibility } from "@/lib/users/visibility-choices";

/** Choix de l'anonymat sur /compte. */
export function VisibilityForm({ current }: { current: ProfileVisibility }) {
  const [state, action, pending] = useActionState(setVisibilityAction, {});
  return (
    <form action={action} className={styles.visibility} id="visibilite">
      <fieldset>
        <legend>Qui voit mon pseudo et mon profil ?</legend>
        {PROFILE_VISIBILITIES.map((value) => (
          <label key={value} className={styles.choice}>
            <input type="radio" name="visibility" value={value} defaultChecked={current === value} />
            <span>
              <b>{visibilityChoices[value].label}</b>
              <small>{visibilityChoices[value].help}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={styles.visibilityFoot}>
        <Button type="submit" size="sm" variant="glass" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
        {state.message && <span className={state.ok ? styles.saved : styles.failed}>{state.message}</span>}
      </div>
    </form>
  );
}
