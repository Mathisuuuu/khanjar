"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { addMember, removeMember, updateMemberRole } from "@/app/research/actions";
import { useMessage, useT } from "@/components/i18n/LocaleProvider";
import { roleLabels as roleLabelsFr, roleLabelsEn, type Member, type MemberRole } from "@/lib/research/types";
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
  const t = useT();
  const message = useMessage();
  const roleLabels = t(roleLabelsFr, roleLabelsEn);

  return (
    <section className={styles.panel} aria-labelledby="members-title">
      <div className={styles.panelHead}>
        <h2 id="members-title">{t("Membres", "Members")}</h2>
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
                    aria-label={t(`Rôle de ${member.email}`, `Role of ${member.email}`)}
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
                    aria-label={t(`Retirer ${member.email}`, `Remove ${member.email}`)}
                    onClick={() => startTransition(() => removeMember(groupId, member.email))}
                  >
                    {t("Retirer", "Remove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>
            {t(
              "Aucun membre pour l'instant. Invite des personnes avec l'e-mail de leur compte.",
              "No members yet. Invite people with their account email.",
            )}
          </p>
        )}

        <form action={formAction} className={styles.form} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="member-email">
              {t("Inviter par e-mail", "Invite by email")}
            </label>
            <input
              id="member-email"
              name="email"
              type="email"
              autoComplete="off"
              key={state.ok ? state.message : "member-email"}
              defaultValue={state.ok ? "" : state.values?.email}
              aria-invalid={!!errors.email}
              placeholder={t("adresse du compte Griffin Lab", "Griffin Lab account email")}
            />
            {errors.email && <span className={styles.error}>{message(errors.email)}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="member-role">
              {t("Droits", "Permissions")}
            </label>
            <select id="member-role" name="role" defaultValue="editor">
              <option value="editor">{roleLabels.editor} {t("(ajouter et supprimer)", "(add and delete)")}</option>
              <option value="viewer">{roleLabels.viewer}</option>
            </select>
          </div>
          <div className={styles.formActions}>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t("Ajout…", "Adding…") : t("Ajouter", "Add")}
            </Button>
            {state.message && (
              <span className={state.ok ? styles.success : styles.error} role="status">
                {message(state.message)}
              </span>
            )}
          </div>
        </form>
        <p className={styles.note}>
          {t(
            "La personne retrouve le groupe dans Recherches dès qu'elle se connecte avec cette adresse.",
            "The person finds the group in Research as soon as they sign in with this address.",
          )}
        </p>
      </div>
    </section>
  );
}
