import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { listBooksOf } from "@/lib/books/repository";
import { postsByAuthor } from "@/lib/likes";
import { canRead } from "@/lib/research/access";
import { getResearchRepository } from "@/lib/research/repository";
import { findProfileByPseudo, getVisibility, resolveIdentities, visibilityChoices } from "@/lib/users/identity";
import { getViewer } from "@/lib/viewer";
import styles from "./membre.module.css";

type Props = { params: Promise<{ pseudo: string }> };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

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
  return { title: found ? found.profile.pseudo : "Membre", robots: { index: false, follow: false } };
}

export default async function MemberPage({ params }: Props) {
  const found = await loadVisible((await params).pseudo);
  if (!found) notFound();
  const { profile, viewer, identity } = found;
  const self = viewer?.id === profile.userKey;

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
      <PageHeader crumb="Membres" title={profile.pseudo}>
        Membre depuis le {dateFormat.format(new Date(profile.createdAt))}.
      </PageHeader>

      <div className={`container ${styles.page}`}>
        {self && visibility && (
          <p className={styles.selfNote}>
            C&apos;est ton profil. Visibilité : <b>{visibilityChoices[visibility].label}</b>.{" "}
            <Link href="/compte#visibilite">Modifier</Link>
          </p>
        )}
        {!self && identity.maskedForOthers && (
          <p className={styles.selfNote}>Ce profil est masqué pour la plupart des visiteurs ; tu le vois grâce à ton rôle.</p>
        )}

        <dl className={styles.stats}>
          <div>
            <dt>Likes reçus</dt>
            <dd>{likesReceived}</dd>
          </div>
          <div>
            <dt>Publications</dt>
            <dd>{visiblePosts.length}</dd>
          </div>
          <div>
            <dt>Recherches</dt>
            <dd>{contributed.length}</dd>
          </div>
          <div>
            <dt>Books</dt>
            <dd>{books.length}</dd>
          </div>
        </dl>

        <div className={styles.columns}>
          <section className={styles.panel} aria-labelledby="contrib-title">
            <h2 id="contrib-title">Recherches auxquelles {profile.pseudo} a contribué</h2>
            {contributed.length === 0 ? (
              <p className={styles.empty}>Aucune publication visible pour l&apos;instant.</p>
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
              <h2 id="likes-title">Les plus aimées</h2>
              {mostLiked.length === 0 ? (
                <p className={styles.empty}>Pas encore de like.</p>
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
                <p className={styles.empty}>Connecté à aucun book.</p>
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
