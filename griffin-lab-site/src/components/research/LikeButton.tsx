"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleLikeAction } from "@/app/research/actions";
import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./Research.module.css";

type Props = {
  groupId: string;
  postId: string;
  count: number;
  liked: boolean;
  /** `false` sans session : le bouton mène à la connexion. */
  canLike: boolean;
};

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.4 5c2 0 3.3 1.1 4.1 2.3h3C14.3 6.1 15.6 5 17.6 5 21 5 22.7 8.4 21.2 11.4 19 15.6 12 20 12 20z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Like d'une publication ; mise à jour immédiate, puis état confirmé par le serveur. */
export function LikeButton({ groupId, postId, count, liked, canLike }: Props) {
  const t = useT();
  const [state, setState] = useState({ count, liked });
  const [pending, startTransition] = useTransition();
  const label = `${state.count} like${state.count > 1 ? "s" : ""}`;

  if (!canLike) {
    return (
      <Link href={`/sign-in?callbackUrl=/research/${groupId}`} className={styles.like} aria-label={t(`${label}. Connecte-toi pour aimer`, `${label}. Sign in to like`)}>
        <Heart filled={false} />
        {state.count}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.like} ${state.liked ? styles.liked : ""}`}
      aria-pressed={state.liked}
      aria-label={`${state.liked ? t("Je n'aime plus", "Unlike") : t("J'aime", "Like")} · ${label}`}
      disabled={pending}
      onClick={() => {
        const previous = state;
        setState({ liked: !previous.liked, count: previous.count + (previous.liked ? -1 : 1) });
        startTransition(async () => {
          const confirmed = await toggleLikeAction(groupId, postId).catch(() => null);
          setState(confirmed ?? previous);
        });
      }}
    >
      <Heart filled={state.liked} />
      {state.count}
    </button>
  );
}
