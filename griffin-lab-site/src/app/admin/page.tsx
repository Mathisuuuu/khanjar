import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { ConfirmButton } from "@/components/research/ConfirmButton";
import { configRole, higherRole, type SiteRole } from "@/lib/admin/roles";
import { getStats, listAccounts, listAllGroups, listBanned } from "@/lib/admin/repository";
import { requireAdmin } from "@/lib/viewer";
import { banAction, deleteAccountAction, deleteGroupAction, unbanAction } from "./actions";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

const providerLabels: Record<string, string> = {
  credentials: "E-mail",
  discord: "Discord",
  google: "Google",
  apple: "Apple",
  github: "GitHub",
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const date = (iso: string) => dateFormat.format(new Date(iso));

type Props = { searchParams: Promise<{ q?: string }> };

/** Espace administrateur : comptes, bannissements, groupes de recherche, lien vers la modération. */
export default async function AdminPage({ searchParams }: Props) {
  const admin = await requireAdmin();
  const q = ((await searchParams).q ?? "").slice(0, 100);
  const [stats, accounts, banned, groups] = await Promise.all([getStats(), listAccounts(q), listBanned(), listAllGroups()]);

  const tiles = [
    { label: "Comptes", value: stats.accounts },
    { label: "Propositions", value: stats.proposals, href: "/admin/propositions?statut=all" },
    { label: "En attente", value: stats.pending, href: "/admin/propositions?statut=pending" },
    { label: "Groupes", value: stats.groups },
    { label: "Publications", value: stats.posts },
    { label: "Bannis", value: stats.banned },
  ];

  return (
    <>
      <PageHeader crumb="Administration" title="Administration">
        Gère les comptes, les groupes de recherche et les propositions. Les suppressions sont définitives.
      </PageHeader>

      <div className={`container ${styles.page}`}>
        <div className={styles.tiles}>
          {tiles.map((tile) => {
            const content = (
              <>
                <b>{tile.value}</b>
                <span>{tile.label}</span>
              </>
            );
            return tile.href ? (
              <Link key={tile.label} href={tile.href} className={`${styles.tile} ${styles.tileLink}`}>
                {content}
              </Link>
            ) : (
              <div key={tile.label} className={styles.tile}>
                {content}
              </div>
            );
          })}
        </div>

        <section className={styles.panel} aria-labelledby="mod-title">
          <div className={styles.head}>
            <h2 id="mod-title">Propositions</h2>
            <Link href="/admin/propositions" className={styles.action}>
              Gérer les propositions →
            </Link>
          </div>
          <p className={styles.note}>
            Toutes les propositions au même endroit : valide, refuse ou mets en test, donne un score et un avis, puis
            place les stratégies validées dans les books. Raccourcis clavier : J/K pour naviguer, V, T, F, R pour
            décider.
          </p>
        </section>

        <section className={styles.panel} aria-labelledby="accounts-title">
          <div className={styles.head}>
            <h2 id="accounts-title">Comptes</h2>
            <form className={styles.search} role="search">
              <input name="q" defaultValue={q} placeholder="Pseudo ou e-mail" aria-label="Rechercher un compte" />
              <button type="submit" className={styles.action}>
                Rechercher
              </button>
            </form>
          </div>
          {accounts.length === 0 ? (
            <p className={styles.note}>Aucun compte{q && " pour cette recherche"}.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Pseudo</th>
                    <th>Rôle</th>
                    <th>Connexion</th>
                    <th>Créé le</th>
                    <th>Contenu</th>
                    <th>
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => {
                    const self = account.userKey === admin.id;
                    const fixed = configRole(account.provider, account.email?.toLowerCase() ?? null);
                    // un admin nommé ne vaut que pour un compte e-mail (même règle que la session)
                    const given = account.storedRole === "admin" && account.provider !== "credentials" ? "team" : account.storedRole;
                    const role = higherRole(fixed, given);
                    const allowed: SiteRole[] = ["member", "team"];
                    if (admin.isOwner && account.provider === "credentials" && account.verified) allowed.push("admin");
                    const locked = self
                      ? "C'est ton compte."
                      : fixed === "admin"
                        ? "Administrateur fixé par la configuration du serveur."
                        : role === "admin" && !admin.isOwner
                          ? "Seul un administrateur principal peut retirer un admin."
                          : undefined;
                    return (
                      <tr key={account.userKey} className={account.banned ? styles.bannedRow : undefined}>
                        <td>
                          <b>{account.pseudo}</b>
                          {self && <span className={styles.badge}>toi</span>}
                          {account.banned && <span className={`${styles.badge} ${styles.badgeRed}`}>banni</span>}
                          {account.email && <small>{account.email}</small>}
                        </td>
                        <td>
                          <RoleSelect
                            userKey={account.userKey}
                            pseudo={account.pseudo}
                            role={role}
                            allowed={allowed}
                            locked={locked}
                          />
                          {fixed === "team" && role === "team" && <small>fixé par la configuration</small>}
                        </td>
                        <td>
                          {providerLabels[account.provider] ?? account.provider}
                          {account.verified === false && <small>adresse non confirmée</small>}
                        </td>
                        <td>{date(account.createdAt)}</td>
                        <td>
                          {account.proposals} prop. · {account.groups} groupes · {account.posts} publ.
                        </td>
                        <td>
                          {!self && (
                            <div className={styles.rowActions}>
                              {account.banned ? (
                                <ConfirmButton
                                  action={unbanAction.bind(null, account.userKey)}
                                  confirm={`Lever le bannissement de ${account.pseudo} ?`}
                                >
                                  Débannir
                                </ConfirmButton>
                              ) : (
                                <form action={banAction.bind(null, account.userKey)} className={styles.banForm}>
                                  <input name="reason" placeholder="Raison (facultatif)" maxLength={200} aria-label={`Raison du bannissement de ${account.pseudo}`} />
                                  <button type="submit" className={styles.danger}>
                                    Bannir
                                  </button>
                                </form>
                              )}
                              <ConfirmButton
                                action={deleteAccountAction.bind(null, account.userKey)}
                                confirm={`Supprimer le compte ${account.pseudo} et tout son contenu (propositions, groupes, publications) ? C'est définitif.`}
                              >
                                Supprimer
                              </ConfirmButton>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.note}>
            Rôle : « Équipe » peut créer des recherches officielles et gérer les books ; « Admin » a accès à cet espace.
            Le rôle admin se donne seulement à un compte e-mail confirmé. Bannir bloque la connexion et coupe les sessions ouvertes, sans rien effacer. Supprimer efface le compte et
            tout ce qu&apos;il a publié : un compte Discord ou GitHub supprimé peut revenir, bannis-le pour l&apos;en
            empêcher.
          </p>
        </section>

        {banned.length > 0 && (
          <section className={styles.panel} aria-labelledby="banned-title">
            <div className={styles.head}>
              <h2 id="banned-title">Comptes bannis</h2>
            </div>
            <ul className={styles.list}>
              {banned.map((ban) => (
                <li key={ban.userKey}>
                  <span>
                    <b>{ban.pseudo ?? ban.userKey}</b> · {providerLabels[ban.userKey.split(":")[0]] ?? ""} · le{" "}
                    {date(ban.bannedAt)}
                    {ban.reason && <small>Raison : {ban.reason}</small>}
                  </span>
                  <ConfirmButton
                    action={unbanAction.bind(null, ban.userKey)}
                    confirm={`Lever le bannissement de ${ban.pseudo ?? "ce compte"} ?`}
                  >
                    Débannir
                  </ConfirmButton>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.panel} aria-labelledby="groups-title">
          <div className={styles.head}>
            <h2 id="groups-title">Groupes de recherche</h2>
            <span className={styles.count}>{groups.length}</span>
          </div>
          {groups.length === 0 ? (
            <p className={styles.note}>Aucun groupe.</p>
          ) : (
            <ul className={styles.list}>
              {groups.map((group) => (
                <li key={group.id}>
                  <span>
                    <Link href={`/recherches/${group.id}`}>
                      <b>{group.name}</b>
                    </Link>
                    <small>
                      {group.kind === "official" ? "Griffin Lab" : "Communauté"} ·{" "}
                      {group.visibility === "private" ? "privé" : "public"} · {group.ownerName} · {group.posts}{" "}
                      publication{group.posts > 1 ? "s" : ""}
                    </small>
                  </span>
                  <ConfirmButton
                    action={deleteGroupAction.bind(null, group.id)}
                    confirm={`Supprimer le groupe « ${group.name} », ses publications et ses fichiers ? C'est définitif.`}
                  >
                    Supprimer
                  </ConfirmButton>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.note}>
            Pour supprimer une seule publication, ouvre le groupe : en administrateur, chaque publication a un bouton
            « Supprimer », y compris dans les groupes privés.
          </p>
        </section>
      </div>
    </>
  );
}
