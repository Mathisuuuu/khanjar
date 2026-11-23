import { BrandIcon } from "@/components/ui/BrandIcon";
import styles from "@/app/account/account.module.css";

type Translate = (fr: string, en: string) => string;

/**
 * Envoi des certificats en message privé sur Discord (« Mes certificats ») :
 * rappel si le compte Discord est connu, sinon invitation à le lier.
 */
export function CertificateDm({ linked, canLink, t }: { linked: boolean; canLink: boolean; t: Translate }) {
  if (linked) {
    return (
      <p className={styles.certificateDm}>
        <BrandIcon name="discord" size={16} />
        {t(
          "Le bot te suit en message privé sur Discord : chaque étape de tes propositions, puis ton certificat dès la validation. Il faut être sur le serveur et accepter ses messages privés.",
          "The bot keeps you posted by private message on Discord: every step of your submissions, then your certificate once validated. You need to be on the server and accept its private messages.",
        )}
      </p>
    );
  }
  if (!canLink) return null;
  return (
    <div className={`${styles.discordLink} ${styles.certificateInvite}`}>
      <span className={styles.discordAvatar} aria-hidden="true">
        <BrandIcon name="discord" size={20} />
      </span>
      <div className={styles.discordText}>
        <b>{t("Suis tes propositions en message privé", "Follow your submissions by private message")}</b>
        <small>
          {t(
            "Lie ton compte Discord : le bot te prévient à chaque étape (reçue, en test, validée ou refusée) et t'envoie ton certificat dès la validation. Il faut aussi être sur le serveur.",
            "Link your Discord account: the bot tells you at each step (received, in testing, validated or rejected) and sends you your certificate once validated. You also need to be on the server.",
          )}
        </small>
      </div>
      {/* lien classique (pas de prélecture) : la route redirige vers Discord */}
      <a href="/api/discord/link" className={styles.discordButton}>
        <BrandIcon name="discord" size={16} />
        {t("Lier Discord", "Link Discord")}
      </a>
    </div>
  );
}
