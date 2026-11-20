"use client";

import { useTransition } from "react";
import styles from "./Research.module.css";

type ConfirmButtonProps = {
  action: () => Promise<void>;
  confirm: string;
  children: React.ReactNode;
  className?: string;
};

/** Bouton d'action destructrice : demande confirmation, puis appelle l'action serveur. */
export function ConfirmButton({ action, confirm, children, className }: ConfirmButtonProps) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className ?? styles.danger}
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirm)) startTransition(() => action());
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
