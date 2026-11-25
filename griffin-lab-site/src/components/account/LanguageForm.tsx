"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "@/app/account/account.module.css";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { setLocaleAction } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/core";

export type LanguageChoice = "auto" | Locale;

/**
 * Langue du site, dans les paramètres du compte. Par défaut, celle du navigateur ;
 * on peut forcer le français ou l'anglais (mémorisé un an sur cet appareil).
 */
export function LanguageForm({ current, detected }: { current: LanguageChoice; detected: Locale }) {
  const locale = useLocale();
  const en = locale === "en";
  const router = useRouter();
  const [choice, setChoice] = useState<LanguageChoice>(current);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const browser = detected === "en" ? "English" : "Français";

  const choices: { value: LanguageChoice; label: string; help: string; lang?: Locale }[] = [
    {
      value: "auto",
      label: en ? "Automatic" : "Automatique",
      help: en ? `Your browser's language (currently ${browser}).` : `La langue de ton navigateur (en ce moment : ${browser}).`,
    },
    { value: "fr", label: "Français", help: en ? "Always in French." : "Toujours en français.", lang: "fr" },
    { value: "en", label: "English", help: en ? "Always in English." : "Toujours en anglais.", lang: "en" },
  ];

  return (
    <form
      className={styles.visibility}
      id="language"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          await setLocaleAction(choice);
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <fieldset>
        <legend>{en ? "Site language" : "Langue du site"}</legend>
        {choices.map((c) => (
          <label key={c.value} className={styles.choice}>
            <input
              type="radio"
              name="language"
              value={c.value}
              checked={choice === c.value}
              onChange={() => {
                setChoice(c.value);
                setSaved(false);
              }}
            />
            <span>
              <b lang={c.lang}>{c.label}</b>
              <small>{c.help}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={styles.visibilityFoot}>
        <Button type="submit" size="sm" variant="glass" disabled={pending || choice === current}>
          {pending ? "…" : en ? "Save" : "Enregistrer"}
        </Button>
        {saved && !pending && <span className={styles.saved}>{en ? "Language saved." : "Langue enregistrée."}</span>}
      </div>
    </form>
  );
}
