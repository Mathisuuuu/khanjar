"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { addMember, removeMember, updateMemberRole } from "@/app/recherches/actions";
import { roleLabels, type Member, type MemberRole } from "@/lib/research/types";
import styles from "./Research.module.css";

type MembersPanelProps = {
  groupId: string;
  members: Member[];
};

/** Gestion des membres (propriétaire uniquement) : invitation par e-mail, rôle, retrait. */
export function MembersPanel({ groupId, members }: MembersPanelProps) {
  const [state, formAction, pending] = useActionState(addMember.bind(null, groupId), {});
  const [busy, startTransition] = useTransition();
  const errors = state.fieldErrors ?? {};

  return (
    <section className={styles.panel} aria-labelledby="members-title">
      <div className={styles.panelHead}>
        <h2 id="members-title">Membres</h2>
        <span className={styles.meta}>{members.length}</span>
      </div>
      <div className={styles.panelBody}>
        {members.length > 0 ? (
          <ul className={styles.members} aria-busy={busy}>
            {members.map((member) => (
              <li key={member.email} className={styles.member}>
                <span title={member.email}>{member.email}</span>
                <div className={styles.memberActions}>
                  <select
                    aria-label={`Rôle de ${member.email}`}
                    value={member.role}
                    disabled={busy}
                    onChange={(event) =>
                      startTransition(() => updateMemberRole(groupId, member.email, event.target.value as MemberRole))
                    }
                  >
                    <option value="editor">{roleLabels.editor}</option>
                    <option value="viewer">{roleLabels.viewer}</option>
                  </select>
                  <button
                    type="button"
                    className={styles.danger}
                    disabled={busy}
                    aria-label={`Retirer ${member.email}`}
                    onClick={() => startTransition(() => removeMember(groupId, member.email))}
                  >
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>
            Aucun membre pour l&apos;instant. Invite des personnes avec l&apos;e-mail de leur compte.
          </p>
        )}

        <form action={formAction} className={styles.form} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="member-email">
              Inviter par e-mail
            </label>
            <input
              id="member-email"
              name="email"
              type="email"
              autoComplete="off"
              key={state.ok ? state.message : "member-email"}
              defaultValue={state.ok ? "" : state.values?.email}
              aria-invalid={!!errors.email}
              placeholder="adresse du compte Griffin Lab"
            />
            {errors.email && <span className={styles.error}>{errors.email}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="member-role">
              Droits
            </label>
            <select id="member-role" name="role" defaultValue="editor">
              <option value="editor">{roleLabels.editor} (ajouter et supprimer)</option>
              <option value="viewer">{roleLabels.viewer}</option>
            </select>
          </div>
          <div className={styles.formActions}>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Ajout…" : "Ajouter"}
            </Button>
            {state.message && (
              <span className={state.ok ? styles.success : styles.error} role="status">
                {state.message}
              </span>
            )}
          </div>
        </form>
        <p className={styles.note}>
          La personne retrouve le groupe dans Recherches dès qu&apos;elle se connecte avec cette adresse.
        </p>
      </div>
    </section>
  );
}
