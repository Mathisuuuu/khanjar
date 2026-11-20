import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DeleteAccountForm, PasswordForm, PseudoForm } from "@/components/account/AccountForms";
import { VisibilityForm } from "@/components/auth/VisibilityForm";
import { StatusPill } from "@/components/proposals/StatusPill";
import { BrandIcon, type BrandName } from "@/components/ui/BrandIcon";
import { Button } from "@/components/ui/Button";
import { site } from "@/content/site";
import { getAccountOverview } from "@/lib/account/overview";
import { profileHref } from "@/lib/users/identity";
import { getViewer } from "@/lib/viewer";
import { signOutAction } from "../connexion/actions";
import styles from "./compte.module.css";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false, follow: false } };

const providerLabels: Record<string, string> = {
  credentials: "E-mail",
  discord: "Discord",
  google: "Google",
  apple: "Apple",
  github: "GitHub",
};

const sections = [
  { id: "profil", label: "Profil" },
  { id: "securite", label: "Connexion et sécurité" },
  { id: "activite", label: "Mon activité" },
  { id: "acces", label: "Accès au bot" },
  { id: "donnees", label: "Mes données" },
  { id: "suppression", label: "Supprimer le compte" },
];

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const formatDate = (value: string | Date | null) => (value ? dateFormat.format(new Date(value)) : null);

/**
 * Gestion du compte (bouton rond de l'en-tête) : profil et anonymat, connexion et
 * mot de passe, activité, accès au bot, export des données et suppression.
 */
export default async function ComptePage() {
  const [session, viewer] = await Promise.all([auth(), getViewer()]);
  if (!session || !viewer) redirect("/connexion?callbackUrl=/compte");
  if (!viewer.hasPseudo) redirect("/bienvenue?callbackUrl=/compte");

  const data = await getAccountOverview(viewer);
  const { image } = session.user;
  const provider = data.provider;
  const isBrand = ["discord", "google", "apple", "github"].includes(provider);
  const unlocked = data.proposalCounts.validated > 0;
  const since = formatDate(data.memberSince);

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
            {since && <span>Membre depuis le {since}</span>}
          </p>
          <div className={styles.badges}>
            <span className={styles.badge}>
              {isBrand && <BrandIcon name={provider as BrandName} size={13} />}
              {providerLabels[provider] ?? provider}
            </span>
            {viewer.isAdmin && <span className={`${styles.badge} ${styles.badgeAdmin}`}>Administrateur</span>}
            {viewer.isTeam && !viewer.isAdmin && <span className={styles.badge}>Équipe Griffin Lab</span>}
            <span className={`${styles.badge} ${unlocked ? styles.badgeOk : ""}`}>
              {unlocked ? "Accès au bot débloqué" : "Accès au bot verrouillé"}
            </span>
          </div>
        </div>
        <div className={styles.heroActions}>
          <Button href={profileHref(viewer.name)} variant="glass" size="sm">
            Voir mon profil public
          </Button>
          {viewer.isAdmin && (
            <Button href="/admin" variant="glass" size="sm">
              Administration
            </Button>
          )}
          <form action={signOutAction}>
            <Button type="submit" variant="glass" size="sm">
              Se déconnecter
            </Button>
          </form>
        </div>
      </header>

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Sections du compte">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={s.id === "suppression" ? styles.navDanger : undefined}>
              {s.label}
            </a>
          ))}
        </nav>

        <div className={styles.sections}>
          {/* Profil */}
          <section className={styles.section} id="profil">
            <h2>Profil</h2>
            <p className={styles.sectionLead}>Ce que les autres membres voient de toi.</p>
            <PseudoForm current={viewer.name} />
            <VisibilityForm current={data.visibility} />
          </section>

          {/* Connexion et sécurité */}
          <section className={styles.section} id="securite">
            <h2>Connexion et sécurité</h2>
            <dl className={styles.details}>
              <div>
                <dt>Méthode de connexion</dt>
                <dd>{providerLabels[provider] ?? provider}</dd>
              </div>
              {data.email && (
                <div>
                  <dt>Adresse e-mail</dt>
                  <dd>
                    {data.email}
                    {data.hasPassword &&
                      (data.emailVerifiedAt ? (
                        <span className={styles.verified}>vérifiée</span>
                      ) : (
                        <span className={styles.unverified}>non vérifiée</span>
                      ))}
                  </dd>
                </div>
              )}
            </dl>

            {data.hasPassword ? (
              <>
                <h3>Changer de mot de passe</h3>
                <PasswordForm />
                <p className={styles.hint}>
                  Mot de passe oublié ? <Link href="/mot-de-passe-oublie">Recevoir un code par e-mail</Link>
                </p>
              </>
            ) : (
              <p className={styles.hint}>
                Tu te connectes avec {providerLabels[provider] ?? provider} : ton mot de passe et ta sécurité (double
                authentification) se gèrent directement chez {providerLabels[provider] ?? provider}.
              </p>
            )}
          </section>

          {/* Activité */}
          <section className={styles.section} id="activite">
            <h2>Mon activité</h2>
            <dl className={styles.stats}>
              <div>
                <dt>Propositions</dt>
                <dd>{data.proposalCounts.total}</dd>
              </div>
              <div>
                <dt>Validées</dt>
                <dd className={styles.positive}>{data.proposalCounts.validated}</dd>
              </div>
              <div>
                <dt>Publications</dt>
                <dd>{data.posts.length}</dd>
              </div>
              <div>
                <dt>Likes reçus</dt>
                <dd>{data.likesReceived}</dd>
              </div>
            </dl>

            <h3>Mes propositions</h3>
            {data.proposals.length ? (
              <ul className={styles.list}>
                {data.proposals.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <span className={styles.listMain}>
                      <b>{p.title}</b>
                      <small>
                        {p.market} · {formatDate(p.createdAt)}
                        {p.status === "rejected" && p.reason ? ` · ${p.reason}` : ""}
                      </small>
                    </span>
                    <StatusPill status={p.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>
                Aucune proposition pour l&apos;instant. <Link href="/proposer">Proposer une stratégie</Link>
              </p>
            )}
            {data.proposals.length > 8 && (
              <p className={styles.hint}>
                <Link href="/proposer">Voir toutes mes propositions</Link>
              </p>
            )}

            <div className={styles.twoCols}>
              <div>
                <h3>Mes books</h3>
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
                    Tu ne fais partie d&apos;aucun book. L&apos;équipe t&apos;y ajoute quand ta stratégie le rejoint.
                  </p>
                )}
              </div>
              <div>
                <h3>Mes recherches</h3>
                {data.contributedGroups.length || data.ownedGroups.length ? (
                  <ul className={styles.chips}>
                    {data.ownedGroups.map((g) => (
                      <li key={`own-${g.id}`}>
                        <Link href={`/recherches/${g.id}`}>
                          {g.name} <small>· propriétaire</small>
                        </Link>
                      </li>
                    ))}
                    {data.contributedGroups
                      .filter((g) => !data.ownedGroups.some((o) => o.id === g.id))
                      .map((g) => (
                        <li key={g.id}>
                          <Link href={`/recherches/${g.id}`}>
                            {g.name} <small>· {g.posts} publication{g.posts > 1 ? "s" : ""}</small>
                          </Link>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className={styles.empty}>
                    Pas encore de publication. <Link href="/recherches">Voir les recherches</Link>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Accès au bot */}
          <section className={styles.section} id="acces">
            <h2>Accès au bot</h2>
            {unlocked ? (
              <div className={`${styles.access} ${styles.accessOk}`}>
                <b>Débloqué</b>
                <p>
                  {data.proposalCounts.validated} stratégie{data.proposalCounts.validated > 1 ? "s validées" : " validée"} :
                  tu as accès à l&apos;ensemble du bot.
                </p>
              </div>
            ) : (
              <div className={styles.access}>
                <b>Verrouillé</b>
                <p>
                  Une stratégie validée par le script de test débloque l&apos;accès complet.
                  {data.proposalCounts.pending > 0 &&
                    ` ${data.proposalCounts.pending} proposition${data.proposalCounts.pending > 1 ? "s sont" : " est"} en cours d'évaluation.`}
                </p>
                <div className={styles.accessActions}>
                  <Button href="/proposer" size="sm">
                    Proposer une stratégie
                  </Button>
                  <Button href="/a-propos#regles" variant="glass" size="sm">
                    Lire les règles
                  </Button>
                </div>
              </div>
            )}
            <a href={site.discordUrl} target="_blank" rel="noopener noreferrer" className={styles.discord}>
              <BrandIcon name="discord" size={24} />
              <span>
                <b>Rejoins le Discord</b>
                <small>Échange avec les autres contributeurs et suis les stratégies validées.</small>
              </span>
            </a>
          </section>

          {/* Mes données */}
          <section className={styles.section} id="donnees">
            <h2>Mes données</h2>
            <p className={styles.sectionLead}>
              Télécharge tout ce que Griffin Lab garde sur ton compte : profil, propositions, publications, books et
              likes donnés ({data.likesGiven}). Fichier JSON.
            </p>
            <a href="/compte/export" className={styles.download} download>
              Télécharger mes données
            </a>
          </section>

          {/* Suppression */}
          <section className={`${styles.section} ${styles.danger}`} id="suppression">
            <h2>Supprimer le compte</h2>
            <p className={styles.sectionLead}>
              Définitif : ton profil, tes propositions, tes publications, les groupes de recherche dont tu es
              propriétaire et tes likes sont effacés. Pense à télécharger tes données avant.
            </p>
            <DeleteAccountForm pseudo={viewer.name} needsPassword={data.hasPassword} />
          </section>
        </div>
      </div>
    </div>
  );
}
