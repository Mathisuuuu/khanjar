"use client";

import { useState, useTransition } from "react";
import { postCertificateAction, setCertificatePublicAction, type CertificateState } from "@/app/account/actions";
import styles from "@/app/account/account.module.css";
import { useMessage, useT } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";

export type CertificateItem = {
  id: string;
  title: string;
  score: number | null;
  /** Date de validation, déjà formatée. */
  validated: string;
  /** Sert à rafraîchir l'image quand le certificat change. */
  version: string;
  public: boolean;
  /** Date de publication dans #certificates, déjà formatée. */
  posted: string | null;
};

function CertificateCard({ item }: { item: CertificateItem }) {
  const t = useT();
  const message = useMessage();
  const [visible, setVisible] = useState(item.public);
  const [posted, setPosted] = useState(item.posted);
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<CertificateState>({});
  const [pending, startTransition] = useTransition();
  const src = `/api/certificates/${item.id}?v=${encodeURIComponent(item.version)}`;

  const toggle = (next: boolean) =>
    startTransition(async () => {
      setVisible(next);
      const result = await setCertificatePublicAction(item.id, next);
      if (!result.ok) setVisible(!next);
      setState(result);
    });

  const post = () =>
    startTransition(async () => {
      const result = await postCertificateAction(item.id);
      setConfirming(false);
      if (result.ok) setPosted(t("à l'instant", "just now"));
      setState(result);
    });

  return (
    <li>
      <a href={src} target="_blank" rel="noopener" className={styles.certificateImage}>
        {/* eslint-disable-next-line @next/next/no-img-element -- image générée par l'API, pas un fichier statique */}
        <img src={src} alt={t(`Certificat : ${item.title}`, `Certificate: ${item.title}`)} width={1500} height={1060} loading="lazy" />
      </a>
      <div className={styles.certificateBody}>
        <b>{item.title}</b>
        <small>
          {t(`Validée le ${item.validated}`, `Validated on ${item.validated}`)}
          {item.score !== null ? ` · ${t("score", "score")} ${item.score}/100` : ""}
        </small>

        <label className={styles.certificateToggle}>
          <input type="checkbox" checked={visible} disabled={pending} onChange={(e) => toggle(e.target.checked)} />
          <span>{t("Afficher sur mon profil public", "Show on my public profile")}</span>
        </label>

        <div className={styles.certificateActions}>
          <a href={`${src}&download=1`} className={styles.download} download>
            {t("Télécharger", "Download")}
          </a>
          {posted ? (
            <span className={styles.hint}>{t(`Publié dans #certificates (${posted})`, `Shared in #certificates (${posted})`)}</span>
          ) : confirming ? (
            <>
              <Button size="sm" onClick={post} disabled={pending}>
                {pending ? "…" : t("Confirmer la publication", "Confirm and share")}
              </Button>
              <Button size="sm" variant="glass" onClick={() => setConfirming(false)} disabled={pending}>
                {t("Annuler", "Cancel")}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="glass" onClick={() => setConfirming(true)}>
              {t("Publier dans #certificates", "Share in #certificates")}
            </Button>
          )}
        </div>
        {confirming && (
          <small className={styles.hint}>
            {t(
              "Le certificat sera posté une seule fois dans #certificates sur Discord, avec ton pseudo, visible par tout le serveur.",
              "The certificate will be posted once in #certificates on Discord, with your username, visible to the whole server.",
            )}
          </small>
        )}
        {state.message && (
          <span className={state.ok ? styles.saved : styles.failed} role={state.ok ? "status" : "alert"}>
            {message(state.message)}
          </span>
        )}
      </div>
    </li>
  );
}

/** Certificats de la personne connectée : téléchargement, profil public, publication dans #certificates. */
export function Certificates({ items }: { items: CertificateItem[] }) {
  return (
    <ul className={styles.certificates}>
      {items.map((item) => (
        <CertificateCard key={item.id} item={item} />
      ))}
    </ul>
  );
}
