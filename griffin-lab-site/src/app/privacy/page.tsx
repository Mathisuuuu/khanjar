import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import styles from "@/components/layout/DocPage.module.css";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Confidentialité", "Privacy"),
    description: t(
      "Les données que Fleija garde, pourquoi, chez qui, combien de temps, et comment les télécharger ou les supprimer.",
      "The data Fleija keeps, why, with whom, for how long, and how to download or delete it.",
    ),
  };
}

/**
 * Politique de confidentialité (lien demandé par l'écran de connexion Google).
 * Elle décrit ce que le code enregistre réellement : à garder à jour si la base change
 * (src/lib/db/migrations.ts) ou si un prestataire s'ajoute.
 */
export default async function PrivacyPage() {
  const t = await getT();

  const sections = [
    { id: "qui", label: t("Qui sommes-nous", "Who we are") },
    { id: "donnees", label: t("Ce que nous gardons", "What we keep") },
    { id: "pourquoi", label: t("Pourquoi", "Why") },
    { id: "prestataires", label: t("Prestataires", "Providers") },
    { id: "duree", label: t("Durée", "How long") },
    { id: "droits", label: t("Tes droits", "Your rights") },
  ];

  return (
    <>
      <PageHeader crumb={t("Confidentialité", "Privacy")} title={t("Politique de confidentialité", "Privacy policy")} />

      <div className={`container ${styles.layout}`}>
        <nav className={styles.toc} aria-label={t("Sommaire", "Contents")}>
          <div className={styles.tocGroup}>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        <div>
          <article className={styles.rule} id="qui">
            <p className={styles.number}>01</p>
            <h2>{t("Qui sommes-nous", "Who we are")}</h2>
            <p>
              {t(
                "Fleija (fleija.live) est un projet gratuit, tenu par une équipe d'étudiants en France. Nous sommes responsables des données décrites ici. Pas de publicité, pas de revente de données, pas de traceur publicitaire ni de mesure d'audience tierce.",
                "Fleija (fleija.live) is a free project run by a team of students in France. We are responsible for the data described here. No ads, no selling of data, no advertising trackers and no third-party analytics.",
              )}
            </p>
            <p>
              {t(
                "Pour toute question sur tes données, écris-nous sur le serveur Discord de Fleija, dans le salon #questions ou en message privé à l'équipe.",
                "For any question about your data, write to us on the Fleija Discord server, in the #questions channel or by private message to the team.",
              )}
            </p>
          </article>

          <article className={styles.rule} id="donnees">
            <p className={styles.number}>02</p>
            <h2>{t("Ce que nous gardons", "What we keep")}</h2>
            <ul>
              <li>
                {t(
                  "Compte par e-mail : ton adresse e-mail, ton pseudo et ton mot de passe sous forme hachée (jamais en clair).",
                  "Email account: your email address, your username and your password in hashed form (never in plain text).",
                )}
              </li>
              <li>
                {t(
                  "Connexion avec Discord ou Google : l'identifiant de ton compte chez ce service et le pseudo que tu choisis chez nous. Pour Discord, nous gardons aussi le lien vers ta photo de profil (affichée dans les books). Ton nom, ton adresse e-mail et ta photo Google ne sont pas enregistrés dans notre base : ils restent dans le cookie de session de ton navigateur, le temps de la session.",
                  "Sign-in with Discord or Google: your account identifier with that service and the username you choose with us. For Discord, we also keep the link to your profile picture (shown in the books). Your Google name, email address and picture are not stored in our database: they stay in your browser's session cookie for the length of the session.",
                )}
              </li>
              <li>
                {t(
                  "Ce que tu publies : tes propositions de stratégies, tes messages et fichiers dans les recherches, tes « j'aime », tes certificats et ta participation aux books. Quand quelqu'un t'invite dans une recherche privée, nous gardons l'adresse e-mail invitée.",
                  "What you publish: your strategy submissions, your posts and files in research groups, your likes, your certificates and your participation in books. When someone invites you to a private research group, we keep the invited email address.",
                )}
              </li>
              <li>
                {t(
                  "Technique : un cookie de session (connexion), un cookie de langue, quelques préférences d'affichage gardées dans ton navigateur, et des compteurs anti-abus temporaires (par adresse IP ou par compte) qui s'effacent au bout de quelques minutes à une heure.",
                  "Technical: a session cookie (sign-in), a language cookie, a few display preferences kept in your browser, and temporary anti-abuse counters (per IP address or per account) that expire after a few minutes to an hour.",
                )}
              </li>
            </ul>
          </article>

          <article className={styles.rule} id="pourquoi">
            <p className={styles.number}>03</p>
            <h2>{t("Pourquoi", "Why")}</h2>
            <ul>
              <li>{t("Faire fonctionner ton compte et te reconnaître à la connexion.", "To run your account and recognise you when you sign in.")}</li>
              <li>{t("Tester tes propositions et t'envoyer leur avancement et ton certificat (sur le site, et en message privé Discord si tu as lié ton compte).", "To test your submissions and send you their progress and your certificate (on the site, and by Discord private message if you linked your account).")}</li>
              <li>{t("T'envoyer les e-mails nécessaires : confirmation d'adresse, réinitialisation du mot de passe.", "To send you the emails we need to: address confirmation, password reset.")}</li>
              <li>{t("Protéger le site contre les abus (essais de mots de passe, envois en masse) et modérer.", "To protect the site against abuse (password guessing, mass submissions) and to moderate.")}</li>
            </ul>
          </article>

          <article className={styles.rule} id="prestataires">
            <p className={styles.number}>04</p>
            <h2>{t("Prestataires", "Providers")}</h2>
            <ul>
              <li>{t("OVHcloud : héberge le serveur et la base de données du site.", "OVHcloud: hosts the site's server and database.")}</li>
              <li>{t("Brevo : envoie les e-mails du site.", "Brevo: sends the site's emails.")}</li>
              <li>{t("Discord et Google : seulement si tu choisis de te connecter avec eux, ou de lier ton compte Discord.", "Discord and Google: only if you choose to sign in with them, or to link your Discord account.")}</li>
            </ul>
            <p>
              {t(
                "Avec Google, nous demandons seulement ton identité de base (nom, adresse e-mail, photo) : aucun accès à tes e-mails, à ton Drive ou à tes contacts.",
                "With Google, we only ask for your basic identity (name, email address, picture): no access to your emails, your Drive or your contacts.",
              )}
            </p>
          </article>

          <article className={styles.rule} id="duree">
            <p className={styles.number}>05</p>
            <h2>{t("Durée", "How long")}</h2>
            <p>
              {t(
                "Nous gardons tes données tant que ton compte existe. Une session dure 14 jours au plus sans visite. Les liens envoyés par e-mail expirent d'eux-mêmes. Quand tu supprimes ton compte, nous effaçons ton profil, tes propositions, tes recherches et messages, tes « j'aime » et ta place dans les books.",
                "We keep your data as long as your account exists. A session lasts at most 14 days without a visit. Links sent by email expire on their own. When you delete your account, we erase your profile, your submissions, your research groups and posts, your likes and your place in the books.",
              )}
            </p>
          </article>

          <article className={styles.rule} id="droits">
            <p className={styles.number}>06</p>
            <h2>{t("Tes droits", "Your rights")}</h2>
            <p>
              {t(
                <>
                  Depuis <Link href="/account">ton compte</Link>, tu peux télécharger toutes tes données, changer ton pseudo,
                  cacher ton profil, délier Discord et supprimer ton compte. Tu peux aussi nous demander d&apos;accéder à
                  tes données, de les corriger ou de les effacer (RGPD), et adresser une réclamation à la CNIL (cnil.fr).
                </>,
                <>
                  From <Link href="/account">your account</Link>, you can download all your data, change your username,
                  hide your profile, unlink Discord and delete your account. You can also ask us to access, correct or
                  erase your data (GDPR), and file a complaint with the CNIL (cnil.fr), the French data protection authority.
                </>,
              )}
            </p>
            <p>{t("Dernière mise à jour : novembre 2026.", "Last updated: November 2026.")}</p>
          </article>
        </div>
      </div>
    </>
  );
}
