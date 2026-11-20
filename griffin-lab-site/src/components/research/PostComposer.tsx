"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/app/recherches/actions";
import { ACCEPTED_EXTENSIONS, MAX_FILES_PER_POST } from "@/lib/research/files";
import styles from "./Research.module.css";

type PostComposerProps = {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
};

/** Formulaire de publication : texte façon blog, lien et pièces jointes (PDF, scripts, données). */
export function PostComposer({ action }: PostComposerProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};
  const values = state.ok ? {} : (state.values ?? {});

  // vide le formulaire après une publication réussie
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className={styles.panel} aria-labelledby="composer-title">
      <div className={styles.panelHead}>
        <h2 id="composer-title">Nouvelle publication</h2>
      </div>
      <form ref={formRef} action={formAction} className={`${styles.panelBody} ${styles.form}`} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="post-title">
            Titre
          </label>
          <input
            id="post-title"
            name="title"
            required
            maxLength={140}
            defaultValue={values.title}
            key={`title-${values.title ?? ""}`}
            aria-invalid={!!errors.title}
          />
          {errors.title && <span className={styles.error}>{errors.title}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="post-body">
            Texte
          </label>
          <textarea
            id="post-body"
            name="body"
            required
            maxLength={20000}
            defaultValue={values.body}
            key={`body-${values.body?.length ?? 0}`}
            aria-invalid={!!errors.body}
            placeholder="Hypothèse, méthode, résultats, limites…"
            style={{ minHeight: 160 }}
          />
          {errors.body && <span className={styles.error}>{errors.body}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="post-link">
            Lien (facultatif)
          </label>
          <input
            id="post-link"
            name="link"
            type="url"
            inputMode="url"
            defaultValue={values.link}
            key={`link-${values.link ?? ""}`}
            aria-invalid={!!errors.link}
            placeholder="https://ssrn.com/…"
          />
          {errors.link && <span className={styles.error}>{errors.link}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="post-files">
            Pièces jointes
          </label>
          <input
            id="post-files"
            name="files"
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            aria-invalid={!!errors.files}
            aria-describedby="post-files-help"
          />
          <span id="post-files-help" className={styles.help}>
            PDF, scripts (.py, .pine, .r…), notebooks, CSV, JSON, Excel. {MAX_FILES_PER_POST} fichiers de 10 Mo maximum.
          </span>
          {errors.files && <span className={styles.error}>{errors.files}</span>}
        </div>

        <div className={styles.formActions}>
          <Button type="submit" disabled={pending}>
            {pending ? "Publication…" : "Publier"}
          </Button>
          {state.message && (
            <span className={state.ok ? styles.success : styles.error} role="status">
              {state.message}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
