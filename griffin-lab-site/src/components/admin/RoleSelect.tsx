"use client";

import { useState, useTransition } from "react";
import { setRoleAction } from "@/app/admin/actions";
import type { SiteRole } from "@/lib/admin/roles";
import styles from "./RoleSelect.module.css";

const LABELS: Record<SiteRole, string> = { member: "Membre", team: "Équipe", admin: "Admin" };

type Props = {
  userKey: string;
  pseudo: string;
  /** rôle effectif affiché */
  role: SiteRole;
  /** rôles proposés ; ceux qui ne sont pas permis sont désactivés */
  allowed: SiteRole[];
  /** raison affichée quand le rôle ne peut pas être changé */
  locked?: string;
};

/** Choix du rôle d'un compte dans /admin : enregistré dès qu'on change la valeur. */
export function RoleSelect({ userKey, pseudo, role, allowed, locked }: Props) {
  const [value, setValue] = useState(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (locked) {
    return (
      <span className={styles.fixed} data-role={role} title={locked}>
        {LABELS[role]}
      </span>
    );
  }

  const change = (next: SiteRole) => {
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await setRoleAction(userKey, next);
      if (!result.ok) {
        setValue(previous);
        setError(result.message ?? "Impossible de changer le rôle.");
      }
    });
  };

  return (
    <span className={styles.wrap}>
      <select
        className={styles.select}
        data-role={value}
        value={value}
        disabled={pending}
        aria-label={`Rôle de ${pseudo}`}
        onChange={(event) => change(event.target.value as SiteRole)}
      >
        {(Object.keys(LABELS) as SiteRole[]).map((r) => (
          <option key={r} value={r} disabled={!allowed.includes(r) && r !== value}>
            {LABELS[r]}
          </option>
        ))}
      </select>
      {error && (
        <small className={styles.error} role="alert">
          {error}
        </small>
      )}
    </span>
  );
}
