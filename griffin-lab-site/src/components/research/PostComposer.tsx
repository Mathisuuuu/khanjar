"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useLocale, useMessage, useT } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/app/recherches/actions";
import { ACCEPTED_EXTENSIONS, formatFileSize, MAX_FILES_PER_POST } from "@/lib/research/files";
import type { Attachment, ResearchPost } from "@/lib/research/types";
import styles from "./Research.module.css";

const answers = new WeakMap<FormState, number>();
let answerCount = 0;
/** Identifiant stable par réponse du serveur. */
function formKey(state: FormState) {
  if (!answers.has(state)) answers.set(state, answerCount++);
  return answers.get(state);
}

type PostComposerProps = {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  /** Publication à modifier ; absente pour une nouvelle publication. */
  post?: ResearchPost;
  /** Lien « Annuler » (modification). */
  cancelHref?: string;
};

/**
 * Formulaire d'une publication façon article : surtitre, titre, chapô, texte,
 * lien et documents. Sert à publier et à modifier (on peut alors retirer des documents).
 */
export function PostComposer({ action, post, cancelHref }: PostComposerProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const t = useT();
  const message = useMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};
  const editing = !!post;
  const initial = post
    ? { title: post.title, category: post.category, summary: post.summary, body: post.body, link: post.link }
    : {};
  const values: Record<string, string | undefined> = state.ok && !editing ? {} : (state.values ?? initial);
  const prefix = editing ? `edit-${post.id}` : "post";

  // vide le formulaire après une publication réussie
  useEffect(() => {
    if (state.ok && !editing) formRef.current?.reset();
  }, [state, editing]);

  const field = (name: string) => ({
    id: `${prefix}-${name}`,
    name,
    defaultValue: values[name] ?? "",
    "aria-invalid": !!errors[name],
  });

  return (
    <section className={styles.panel} aria-labelledby={`${prefix}-heading`}>
      <div className={styles.panelHead}>
        <h2 id={`${prefix}-heading`}>{editing ? t("Modifier la publication", "Edit post") : t("Nouvelle publication", "New post")}</h2>
      </div>
      {/* remonté à chaque réponse : les champs reprennent les valeurs renvoyées en cas d'erreur */}
      <form key={formKey(state)} ref={formRef} action={formAction} className={`${styles.panelBody} ${styles.form}`} noValidate>
        <div className={styles.fieldRow2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${prefix}-category`}>
              {t("Surtitre (facultatif)", "Kicker (optional)")}
            </label>
            <input {...field("category")} maxLength={40} placeholder="Backtesting" />
            {errors.category && <span className={styles.error}>{message(errors.category)}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${prefix}-title`}>
              {t("Titre", "Title")}
            </label>
            <input {...field("title")} required maxLength={140} />
            {errors.title && <span className={styles.error}>{message(errors.title)}</span>}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${prefix}-summary`}>
            {t("Chapô (facultatif)", "Summary (optional)")}
          </label>
          <textarea
            {...field("summary")}
            maxLength={320}
            placeholder={t("Deux phrases qui résument la publication. Sinon, le début du texte est utilisé.", "Two sentences summarising the post. Otherwise, the start of the text is used.")}
            style={{ minHeight: 70 }}
          />
          {errors.summary && <span className={styles.error}>{message(errors.summary)}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${prefix}-body`}>
            {t("Texte", "Text")}
          </label>
          <textarea
            {...field("body")}
            required
            maxLength={20000}
            placeholder={t("Hypothèse, méthode, résultats, limites…", "Hypothesis, method, results, limitations…")}
            style={{ minHeight: 200 }}
          />
          {errors.body && <span className={styles.error}>{message(errors.body)}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${prefix}-link`}>
            {t("Lien (facultatif)", "Link (optional)")}
          </label>
          <input {...field("link")} type="url" inputMode="url" placeholder="https://ssrn.com/…" />
          {errors.link && <span className={styles.error}>{message(errors.link)}</span>}
        </div>

        {editing && post.attachments.length > 0 && <CurrentDocuments files={post.attachments} />}

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${prefix}-files`}>
            {editing ? t("Ajouter des documents", "Add documents") : t("Documents", "Documents")}
          </label>
          <input
            id={`${prefix}-files`}
            name="files"
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            aria-invalid={!!errors.files}
            aria-describedby={`${prefix}-files-help`}
          />
          <span id={`${prefix}-files-help`} className={styles.help}>
            {t(
              `PDF, scripts (.py, .pine, .r…), notebooks, CSV, JSON, Excel. ${MAX_FILES_PER_POST} fichiers de 10 Mo maximum.`,
              `PDF, scripts (.py, .pine, .r…), notebooks, CSV, JSON, Excel. Up to ${MAX_FILES_PER_POST} files of 10 MB.`,
            )}
          </span>
          {errors.files && <span className={styles.error}>{message(errors.files)}</span>}
        </div>

        <div className={styles.formActions}>
          <Button type="submit" disabled={pending}>
            {pending ? t("Enregistrement…", "Saving…") : editing ? t("Enregistrer", "Save") : t("Publier", "Publish")}
          </Button>
          {cancelHref && (
            <Link href={cancelHref} className={styles.editLink}>
              {t("Annuler", "Cancel")}
            </Link>
          )}
          {state.message && (
            <span className={state.ok ? styles.success : styles.error} role="status">
              {message(state.message)}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

const fileKindsFr: Record<Attachment["kind"], string> = { pdf: "PDF", script: "Script", notebook: "Notebook", data: "Données" };
const fileKindsEn: Record<Attachment["kind"], string> = { pdf: "PDF", script: "Script", notebook: "Notebook", data: "Data" };

/** Documents déjà joints : « Retirer » les marque pour suppression à l'enregistrement. */
function CurrentDocuments({ files }: { files: Attachment[] }) {
  const t = useT();
  const locale = useLocale();
  const fileKinds = t(fileKindsFr, fileKindsEn);
  const [removed, setRemoved] = useState<string[]>([]);
  const toggle = (id: string) =>
    setRemoved((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <div className={styles.field}>
      <span className={styles.label}>{t("Documents actuels", "Current documents")}</span>
      <ul className={styles.currentFiles}>
        {files.map((file) => {
          const gone = removed.includes(file.id);
          return (
            <li key={file.id} className={gone ? styles.fileRemoved : undefined}>
              {gone && <input type="hidden" name="remove" value={file.id} />}
              <span className={styles.fileKind}>{fileKinds[file.kind]}</span>
              <span className={styles.currentName}>{file.name}</span>
              <small>{gone ? t("sera retiré", "will be removed") : formatFileSize(file.size, locale)}</small>
              <button type="button" className={styles.fileToggle} onClick={() => toggle(file.id)}>
                {gone ? t("Garder", "Keep") : t("Retirer", "Remove")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
