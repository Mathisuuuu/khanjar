import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DeleteAccountForm, PasswordForm, PseudoForm } from "@/components/account/AccountForms";
import { Certificates } from "@/components/account/Certificates";
import { CertificateDm } from "@/components/account/CertificateDm";
import { listCertificates } from "@/lib/certificates/settings";
import { VisibilityForm } from "@/components/auth/VisibilityForm";
import { StatusPill } from "@/components/proposals/StatusPill";
import { BrandIcon, type BrandName } from "@/components/ui/BrandIcon";
import { Button } from "@/components/ui/Button";
import { site } from "@/content/site";
import { getAccountOverview } from "@/lib/account/overview";
import { intlLocale, makeT } from "@/lib/i18n/core";
import { getLocale, getMessage, getT } from "@/lib/i18n/server";
import { marketLabel } from "@/lib/proposals/types";
import { getDiscordLink } from "@/lib/discord/links";
import { linkConfigured } from "@/lib/discord/oauth";
import { profileHref } from "@/lib/users/identity";
import { getViewer } from "@/lib/auth/viewer";
import { signOutAction } from "../sign-in/actions";
import { unlinkDiscordAction } from "./actions";
import styles from "./account.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Mon compte", "My account"), robots: { index: false, follow: false } };
}

/**
 * Gestion du compte (bouton rond de l'en-tête) : profil et anonymat, connexion et
 * mot de passe, activité, accès au book, export des données et suppression.
 */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ password?: string; discord?: string }> }) {
  const [session, viewer, locale, message] = await Promise.all([auth(), getViewer(), getLocale(), getMessage()]);
  if (!session || !viewer) redirect("/sign-in?callbackUrl=/account");
  if (!viewer.hasPseudo) redirect("/welcome?callbackUrl=/account");
  const t = makeT(locale);
  const query = await searchParams;
  const passwordChanged = query.password === "1";
  const discordStatus = query.discord;

  const providerLabels: Record<string, string> = {
    credentials: t("E-mail", "Email"),
    discord: "Discord",
    google: "Google",
  };

  const sections = [
    { id: "profil", label: t("Profil", "Profile") },
    { id: "securite", label: t("Connexion et sécurité", "Sign-in and security") },
    { id: "activite", label: t("Mon activité", "My activity") },
    { id: "acces", label: t("Accès au book", "Book access") },
    { id: "certificats", label: t("Mes certificats", "My certificates") },
    { id: "donnees", label: t("Mes données", "My data") },
    { id: "suppression", label: t("Supprimer le compte", "Delete account") },
  ];

  const dateFormat = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric" });
  const formatDate = (value: string | Date | null) => (value ? dateFormat.format(new Date(value)) : null);

  const [data, discordLink, certificates] = await Promise.all([
    getAccountOverview(viewer),
    getDiscordLink(viewer.id),
    listCertificates(viewer.id),
  ]);
  const isDiscordAccount = viewer.id.startsWith("discord:");
  const discordNotices: Record<string, [string, string, boolean]> = {
    linked: ["Compte Discord lié : ta photo de profil s'affiche dans les books.", "Discord account linked: your profile picture now shows in the books.", true],
    unlinked: ["Compte Discord délié.", "Discord account unlinked.", true],
    error: ["La liaison avec Discord n'a pas abouti. Réessaie.", "Linking with Discord failed. Please try again.", false],
    limit: ["Trop de tentatives. Réessaie dans une heure.", "Too many attempts. Try again in an hour.", false],
  };
  const discordNotice = discordStatus ? discordNotices[discordStatus] : undefined;
  const { image } = session.user;
  const provider = data.provider;
  const providerName = providerLabels[provider] ?? provider;
  const isBrand = ["discord", "google"].includes(provider);
  const unlocked = data.proposalCounts.validated > 0;
  const since = formatDate(data.memberSince);
  const validated = data.proposalCounts.validated;
  const pendingCount = data.proposalCounts.pending;

  return (
    <div className={`container ${styles.page}`}>
      {/* En-tête du compte */}
      <header className={styles.hero}>
        {image ? (
          // avatar fourni par Discord / Google : domaine externe, pas d'optimisation Next
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className={styles.avatar} />
        ) : (
          <span className={styles.avatar}>{viewer.name.charAt(0).toUpperCase()}</span>
        )}
        <div className={styles.identity}>
          <h1>{viewer.name}</h1>
          <p>
            {data.email && <span>{data.email}</span>}
            {since && <span>{t(`Membre depuis le ${since}`, `Member since ${since}`)}</span>}
          </p>
          <div className={styles.badges}>
            <span className={styles.badge}>
              {isBrand && <BrandIcon name={provider as BrandName} size={13} />}
              {providerName}
            </span>
            {viewer.isAdmin && (
              <span className={`${styles.badge} ${styles.badgeAdmin}`}>
                {viewer.isOwner ? "Super admin" : t("Administrateur", "Administrator")}
              </span>
            )}
            {viewer.isTeam && !viewer.isAdmin && (
              <span className={styles.badge}>{t("Équipe Fleija", "Fleija team")}</span>
            )}
            <span className={`${styles.badge} ${unlocked ? styles.badgeOk : ""}`}>
              {unlocked ? t("Accès au book débloqué", "Book access unlocked") : t("Accès au book verrouillé", "Book access locked")}
            </span>
          </div>
        </div>
        <div className={styles.heroActions}>
          <Button href={profileHref(viewer.name)} variant="glass" size="sm">
            {t("Voir mon profil public", "View my public profile")}
          </Button>
          {viewer.isAdmin && (
            <Button href="/admin" variant="glass" size="sm">
              {t("Administration", "Admin")}
            </Button>
          )}
          <form action={signOutAction}>
            <Button type="submit" variant="glass" size="sm" className={styles.signOut}>
              {t("Se déconnecter", "Sign out")}
            </Button>
          </form>
        </div>
      </header>
      {passwordChanged && (
        <p className={styles.saved} role="status">
          {t(
            "Mot de passe changé. Tes autres sessions ouvertes ont été déconnectées.",
            "Password changed. Your other open sessions have been signed out.",
          )}
        </p>
      )}

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label={t("Sections du compte", "Account sections")}>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={s.id === "suppression" ? styles.navDanger : undefined}>
              {s.label}
            </a>
          ))}
        </nav>

        <div className={styles.sections}>
          {/* Profil */}
          <section className={styles.section} id="profil">
            <h2>{t("Profil", "Profile")}</h2>
            <p className={styles.sectionLead}>{t("Ce que les autres membres voient de toi.", "What other members see of you.")}</p>
            <PseudoForm current={viewer.name} />
            <div className={styles.discordLink}>
              {discordLink?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={discordLink.avatarUrl} alt="" width={48} height={48} className={styles.discordAvatar} />
              ) : (
                <span className={styles.discordAvatar} aria-hidden="true">
                  <BrandIcon name="discord" size={20} />
                </span>
              )}
              <div className={styles.discordText}>
                <b>{t("Photo de profil", "Profile picture")}</b>
                <small>
                  {isDiscordAccount
                    ? discordLink?.avatarUrl
                      ? t("Celle de ton compte Discord, affichée dans les books.", "The one from your Discord account, shown in the books.")
                      : t("Ton compte Discord n'a pas de photo : ton initiale s'affiche à la place.", "Your Discord account has no picture: your initial shows instead.")
                    : discordLink
                      ? t("Ton compte Discord est lié : sa photo s'affiche dans les books.", "Your Discord account is linked: its picture shows in the books.")
                      : t("Lie ton compte Discord pour afficher sa photo dans les books. Le site ne lit que ton identifiant et ta photo.", "Link your Discord account to show its picture in the books. The site only reads your ID and picture.")}
                </small>
                {discordNotice && (
                  <p className={discordNotice[2] ? styles.saved : styles.failed} role="status">
                    {t(discordNotice[0], discordNotice[1])}
                  </p>
                )}
              </div>
              {!isDiscordAccount &&
                (discordLink ? (
                  <form action={unlinkDiscordAction}>
                    <Button type="submit" variant="glass" size="sm">
                      {t("Délier", "Unlink")}
                    </Button>
                  </form>
                ) : (
                  linkConfigured() && (
                    // lien classique (pas de prélecture) : la route redirige vers Discord
                    <a href="/api/discord/link" className={styles.discordButton}>
                      <BrandIcon name="discord" size={16} />
                      {t("Lier Discord", "Link Discord")}
                    </a>
                  )
                ))}
            </div>
            <VisibilityForm current={data.visibility} />
          </section>

          {/* Connexion et sécurité */}
          <section className={styles.section} id="securite">
            <h2>{t("Connexion et sécurité", "Sign-in and security")}</h2>
            <dl className={styles.details}>
              <div>
                <dt>{t("Méthode de connexion", "Sign-in method")}</dt>
                <dd>{providerName}</dd>
              </div>
              {data.email && (
                <div>
                  <dt>{t("Adresse e-mail", "Email address")}</dt>
                  <dd>
                    {data.email}
                    {data.hasPassword &&
                      (data.emailVerifiedAt ? (
                        <span className={styles.verified}>{t("vérifiée", "verified")}</span>
                      ) : (
                        <span className={styles.unverified}>{t("non vérifiée", "not verified")}</span>
                      ))}
                  </dd>
                </div>
              )}
            </dl>

            {data.hasPassword ? (
              <>
                <h3>{t("Changer de mot de passe", "Change password")}</h3>
                <PasswordForm />
                <p className={styles.hint}>
                  {t("Mot de passe oublié ?", "Forgot your password?")}{" "}
                  <Link href="/forgot-password">{t("Recevoir un code par e-mail", "Get a code by email")}</Link>
                </p>
              </>
            ) : (
              <p className={styles.hint}>
                {t(
                  `Tu te connectes avec ${providerName} : ton mot de passe et ta sécurité (double authentification) se gèrent directement chez ${providerName}.`,
                  `You sign in with ${providerName}: your password and security (two-factor authentication) are managed directly with ${providerName}.`,
                )}
              </p>
            )}
          </section>

          {/* Activité */}
          <section className={styles.section} id="activite">
            <h2>{t("Mon activité", "My activity")}</h2>
            <dl className={styles.stats}>
              <div>
                <dt>{t("Propositions", "Submissions")}</dt>
                <dd>{data.proposalCounts.total}</dd>
              </div>
              <div>
                <dt>{t("Validées", "Validated")}</dt>
                <dd className={styles.positive}>{validated}</dd>
              </div>
              <div>
                <dt>{t("Publications", "Posts")}</dt>
                <dd>{data.posts.length}</dd>
              </div>
              <div>
                <dt>{t("Likes reçus", "Likes received")}</dt>
                <dd>{data.likesReceived}</dd>
              </div>
            </dl>

            <h3>{t("Mes propositions", "My submissions")}</h3>
            {data.proposals.length ? (
              <ul className={styles.list}>
                {data.proposals.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <span className={styles.listMain}>
                      <b>{p.title}</b>
                      <small>
                        {marketLabel(p.market, locale)} · {formatDate(p.createdAt)}
                        {p.status === "rejected" && p.reason ? ` · ${message(p.reason)}` : ""}
                      </small>
                    </span>
                    <span className={styles.listEnd}>
                      {p.status === "validated" && (
                        <a className={styles.certificate} href={`/api/certificates/${p.id}`} target="_blank" rel="noopener">
                          {t("Certificat", "Certificate")}
                        </a>
                      )}
                      <StatusPill status={p.status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>
                {t("Aucune proposition pour l'instant.", "No submissions yet.")}{" "}
                <Link href="/submit">{t("Proposer une stratégie", "Submit a strategy")}</Link>
              </p>
            )}
            {data.proposals.length > 8 && (
              <p className={styles.hint}>
                <Link href="/submit">{t("Voir toutes mes propositions", "See all my submissions")}</Link>
              </p>
            )}

            <div className={styles.twoCols}>
              <div>
                <h3>{t("Mes books", "My books")}</h3>
                {data.books.length ? (
                  <ul className={styles.chips}>
                    {data.books.map((b) => (
                      <li key={b.id}>
                        <Link href={`/books/${b.id}`}>
                          <i style={{ background: b.color }} aria-hidden="true" />
                          {b.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.empty}>
                    {t(
                      "Tu ne fais partie d'aucun book. L'équipe t'y ajoute quand ta stratégie le rejoint.",
                      "You're not in any book. The team adds you when your strategy joins one.",
                    )}
                  </p>
                )}
              </div>
              <div>
                <h3>{t("Mes recherches", "My research")}</h3>
                {data.contributedGroups.length || data.ownedGroups.length ? (
                  <ul className={styles.chips}>
                    {data.ownedGroups.map((g) => (
                      <li key={`own-${g.id}`}>
                        <Link href={`/research/${g.id}`}>
                          {g.name} <small>· {t("propriétaire", "owner")}</small>
                        </Link>
                      </li>
                    ))}
                    {data.contributedGroups
                      .filter((g) => !data.ownedGroups.some((o) => o.id === g.id))
                      .map((g) => (
                        <li key={g.id}>
                          <Link href={`/research/${g.id}`}>
                            {g.name}{" "}
                            <small>
                              · {g.posts} {t("publication", "post")}
                              {g.posts > 1 ? "s" : ""}
                            </small>
                          </Link>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className={styles.empty}>
                    {t("Pas encore de publication.", "No posts yet.")}{" "}
                    <Link href="/research">{t("Voir les recherches", "See the research")}</Link>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Accès au book */}
          <section className={styles.section} id="acces">
            <h2>{t("Accès au book", "Book access")}</h2>
            {unlocked ? (
              <div className={`${styles.access} ${styles.accessOk}`}>
                <b>{t("Débloqué", "Unlocked")}</b>
                <p>
                  {t(
                    `${validated} stratégie${validated > 1 ? "s validées" : " validée"} : tu as accès à 100 % du book où elle est entrée.`,
                    `${validated} validated strateg${validated > 1 ? "ies" : "y"}: you have access to 100% of the book ${validated > 1 ? "they joined" : "it joined"}.`,
                  )}
                </p>
              </div>
            ) : (
              <div className={styles.access}>
                <b>{t("Verrouillé", "Locked")}</b>
                <p>
                  {t(
                    "Une stratégie validée par le script de test débloque l'accès complet au book où elle entre.",
                    "A strategy validated by the test script unlocks full access to the book it joins.",
                  )}
                  {pendingCount > 0 &&
                    t(
                      ` ${pendingCount} proposition${pendingCount > 1 ? "s sont" : " est"} en cours d'évaluation.`,
                      ` ${pendingCount} submission${pendingCount > 1 ? "s are" : " is"} being assessed.`,
                    )}
                </p>
                <div className={styles.accessActions}>
                  <Button href="/submit" size="sm">
                    {t("Proposer une stratégie", "Submit a strategy")}
                  </Button>
                  <Button href="/about#rules" variant="glass" size="sm">
                    {t("Lire les règles", "Read the rules")}
                  </Button>
                </div>
              </div>
            )}
            <a href={site.discordUrl} target="_blank" rel="noopener noreferrer" className={styles.discord}>
              <BrandIcon name="discord" size={24} />
              <span>
                <b>{t("Rejoins le Discord", "Join the Discord")}</b>
                <small>
                  {t(
                    "Échange avec les autres contributeurs et suis les stratégies validées.",
                    "Talk with other contributors and follow the validated strategies.",
                  )}
                </small>
              </span>
            </a>
          </section>

          {/* Certificats */}
          <section className={styles.section} id="certificats">
            <h2>{t("Mes certificats", "My certificates")}</h2>
            <p className={styles.sectionLead}>
              {t(
                "Chaque stratégie validée te donne un certificat Fleija, refait avec ton pseudo, ton score et la date de validation. Télécharge-le, affiche-le sur ton profil public ou publie-le dans #certificates sur Discord.",
                "Each validated strategy earns you a Fleija certificate, made with your username, your score and the validation date. Download it, show it on your public profile or share it in #certificates on Discord.",
              )}
            </p>
            {/* le bot envoie chaque nouveau certificat en message privé : il lui faut le compte Discord */}
            <CertificateDm linked={isDiscordAccount || Boolean(discordLink)} canLink={linkConfigured()} t={t} />
            {certificates.length ? (
              <Certificates
                items={certificates.map((c) => ({
                  id: c.id,
                  title: c.title,
                  score: c.score,
                  validated: formatDate(c.validatedAt) ?? "",
                  version: `${viewer.name}-${c.score}-${c.validatedAt}`,
                  public: c.public,
                  posted: formatDate(c.postedAt),
                }))}
              />
            ) : (
              <p className={styles.empty}>
                {t("Aucun certificat pour l'instant : une stratégie validée t'en donne un.", "No certificate yet: a validated strategy earns you one.")}{" "}
                <Link href="/submit">{t("Proposer une stratégie", "Submit a strategy")}</Link>
              </p>
            )}
          </section>

          {/* Mes données */}
          <section className={styles.section} id="donnees">
            <h2>{t("Mes données", "My data")}</h2>
            <p className={styles.sectionLead}>
              {t(
                `Télécharge tout ce que Fleija garde sur ton compte : profil, propositions, publications, books et likes donnés (${data.likesGiven}). Fichier JSON.`,
                `Download everything Fleija keeps about your account: profile, submissions, posts, books and likes given (${data.likesGiven}). JSON file.`,
              )}
            </p>
            <a href="/account/export" className={styles.download} download>
              {t("Télécharger mes données", "Download my data")}
            </a>
          </section>

          {/* Suppression */}
          <section className={`${styles.section} ${styles.danger}`} id="suppression">
            <h2>{t("Supprimer le compte", "Delete account")}</h2>
            <p className={styles.sectionLead}>
              {t(
                "Définitif : ton profil, tes propositions, tes publications, les groupes de recherche dont tu es propriétaire et tes likes sont effacés. Pense à télécharger tes données avant.",
                "Permanent: your profile, submissions, posts, the research groups you own and your likes are erased. Remember to download your data first.",
              )}
            </p>
            <DeleteAccountForm pseudo={viewer.name} needsPassword={data.hasPassword} />
          </section>
        </div>
      </div>
    </div>
  );
}
