"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useLocale } from "./LocaleProvider";

/** Bascule FR / EN : affiche la langue vers laquelle on passe. */
/** `label` : texte complet (« English » / « Français ») au lieu du code court. */
export function LanguageSwitch({ className, label = false }: { className?: string; label?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = locale === "fr" ? "en" : "fr";

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      lang={next}
      aria-label={label ? undefined : next === "en" ? "Switch to English" : "Passer en français"}
      title={next === "en" ? "English" : "Français"}
      onClick={() =>
        startTransition(async () => {
          await setLocaleAction(next);
          router.refresh();
        })
      }
    >
      {label ? (next === "en" ? "English" : "Français") : next.toUpperCase()}
    </button>
  );
}
