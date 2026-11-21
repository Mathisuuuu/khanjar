import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { listBooksOf } from "@/lib/books/repository";
import { postsByAuthor } from "@/lib/likes";
import { canRead } from "@/lib/research/access";
import { getResearchRepository } from "@/lib/research/repository";
import { findProfileByPseudo, getVisibility, resolveIdentities, visibilityChoices } from "@/lib/users/identity";
import { visibilityChoicesEn } from "@/lib/users/visibility-choices";
import { intlLocale, makeT } from "@/lib/i18n/core";
import { getLocale, getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";
import styles from "./membre.module.css";

type Props = { params: Promise<{ pseudo: string }> };

/** Le profil n'existe pour la personne qui consulte que si le réglage d'anonymat le permet. */
async function loadVisible(rawPseudo: string) {
  let pseudo: string;
  try {
    pseudo = decodeURIComponent(rawPseudo);
  } catch {
    return null; // adresse mal formée
  }
  const [profile, viewer] = await Promise.all([findProfileByPseudo(pseudo), getViewer()]);
  if (!profile) return null;
  const identity = (await resolveIdentities([profile.userKey], viewer)).get(profile.userKey);
  if (!identity || identity.anonymous) return null;
  return { profile, viewer, identity };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await loadVisible((await params).pseudo);
  const t = await getT();
  return { title: found ? found.profile.pseudo : t("Membre", "Member"), robots: { index: false, follow: false } };
}

export default async function MemberPage({ params }: Props) {
  const found = await loadVisible((await params).pseudo);
  if (!found) notFound();
  const { profile, viewer, identity } = found;
  const self = viewer?.id === profile.userKey;
  const locale = await getLocale();
  const t = makeT(locale);
  const dateFormat = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric" });
  const choices = locale === "en" ? visibilityChoicesEn : visibilityChoices;

  const [books, posts, groups, visibility] = await Promise.all([
    listBooksOf(profile.userKey),
    postsByAuthor(profile.userKey),
    getResearchRepository().listGroups(),
    self ? getVisibility(profile.userKey) : Promise.resolve(null),
  ]);

  // uniquement ce que la personne qui consulte a le droit de lire
  const readable = new Map(groups.filter((g) => canRead(g, viewer)).map((g) => [g.id, g]));
  const visiblePosts = posts.filter((post) => readable.has(post.groupId));
  const likesReceived = visiblePosts.reduce((sum, post) => sum + post.likes, 0);
  const contributed = [...new Set(visiblePosts.map((p) => p.groupId))].map((id) => ({
    group: readable.get(id)!,
    posts: visiblePosts.filter((p) => p.groupId === id),
  }));
  const mostLiked = visiblePosts.filter((p) => p.likes > 0).sort((a, b) => b.likes - a.likes).slice(0, 5);

  return (
    <>
      <PageHeader crumb={t("Membres", "Members")} title={profile.pseudo}>
        {t(
          `Membre depuis le ${dateFormat.format(new Date(profile.createdAt))}.`,
          `Member since ${dateFormat.format(new Date(profile.createdAt))}.`,
        )}
      </PageHeader>

      <div className={`container ${styles.page}`}>
        {self && visibility && (
          <p className={styles.selfNote}>
            {t("C'est ton profil. Visibilité :", "This is your profile. Visibility:")} <b>{choices[visibility].label}</b>.{" "}
            <Link href="/compte#visibilite">{t("Modifier", "Change")}</Link>
          </p>
        )}
        {!self && identity.maskedForOthers && (
          <p className={styles.selfNote}>
            {t(
              "Ce profil est masqué pour la plupart des visiteurs ; tu le vois grâce à ton rôle.",
              "This profile is hidden from most visitors; you can see it because of your role.",
            )}
          </p>
        )}

        <dl className={styles.stats}>
          <div>
            <dt>{t("Likes reçus", "Likes received")}</dt>
            <dd>{likesReceived}</dd>
          </div>
          <div>
            <dt>{t("Publications", "Posts")}</dt>
            <dd>{visiblePosts.length}</dd>
          </div>
          <div>
            <dt>{t("Recherches", "Research")}</dt>
            <dd>{contributed.length}</dd>
          </div>
          <div>
            <dt>Books</dt>
            <dd>{books.length}</dd>
          </div>
        </dl>

        <div className={styles.columns}>
          <section className={styles.panel} aria-labelledby="contrib-title">
            <h2 id="contrib-title">
              {t(`Recherches auxquelles ${profile.pseudo} a contribué`, `Research ${profile.pseudo} has contributed to`)}
            </h2>
            {contributed.length === 0 ? (
              <p className={styles.empty}>{t("Aucune publication visible pour l'instant.", "No visible posts yet.")}</p>
            ) : (
              <ul className={styles.groups}>
                {contributed.map(({ group, posts: groupPosts }) => (
                  <li key={group.id}>
                    <Link href={`/recherches/${group.id}`} className={styles.groupName}>
                      {group.name}
                    </Link>
                    <ul className={styles.posts}>
                      {groupPosts.map((post) => (
                        <li key={post.id}>
                          <span>{post.title}</span>
                          <span className={styles.likes} aria-label={`${post.likes} like${post.likes > 1 ? "s" : ""}`}>
                            ♥ {post.likes}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className={styles.side}>
            <section className={styles.panel} aria-labelledby="likes-title">
              <h2 id="likes-title">{t("Les plus aimées", "Most liked")}</h2>
              {mostLiked.length === 0 ? (
                <p className={styles.empty}>{t("Pas encore de like.", "No likes yet.")}</p>
              ) : (
                <ol className={styles.posts}>
                  {mostLiked.map((post) => (
                    <li key={post.id}>
                      <Link href={`/recherches/${post.groupId}`}>{post.title}</Link>
                      <span className={styles.likes}>♥ {post.likes}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className={styles.panel} aria-labelledby="books-title">
              <h2 id="books-title">Books</h2>
              {books.length === 0 ? (
                <p className={styles.empty}>{t("Connecté à aucun book.", "Not connected to any book.")}</p>
              ) : (
                <ul className={styles.books}>
                  {books.map((book) => (
                    <li key={book.id}>
                      <Link href={`/books/${book.id}`}>
                        <span className={styles.dot} style={{ background: book.color }} aria-hidden="true" />
                        {book.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
