import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { ConfirmButton } from "@/components/research/ConfirmButton";
import { LikeButton } from "@/components/research/LikeButton";
import { PostComposer } from "@/components/research/PostComposer";
import { PostDocuments, PostHeader } from "@/components/research/PostCard";
import styles from "@/components/research/Research.module.css";
import { Button } from "@/components/ui/Button";
import { likesFor } from "@/lib/research/likes";
import { canRead, canWrite } from "@/lib/research/access";
import { getResearchRepository } from "@/lib/research/repository";
import { resolveIdentities } from "@/lib/users/identity";
import { getViewer } from "@/lib/auth/viewer";
import { deletePost, updatePost } from "../../actions";

type Props = {
  params: Promise<{ id: string; postId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

async function load(id: string, postId: string) {
  const repo = getResearchRepository();
  const [group, viewer] = await Promise.all([repo.getGroup(id), getViewer()]);
  // un groupe privé est introuvable pour qui n'en est pas membre
  if (!group || !canRead(group, viewer)) return null;
  const post = await repo.getPost(id, postId);
  if (!post) return null;
  return { group, post, viewer };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, postId } = await params;
  const found = await load(id, postId);
  const t = await getT();
  return { title: found ? found.post.title : t("Recherches", "Research") };
}

/** Une publication en entier ; « Éditer » ouvre le formulaire de modification. */
export default async function PostPage({ params, searchParams }: Props) {
  const [{ id, postId }, { edit: edition }] = await Promise.all([params, searchParams]);
  const found = await load(id, postId);
  if (!found) notFound();
  const { group, post, viewer } = found;
  const t = await getT();

  const writer = canWrite(group, viewer);
  const editing = writer && edition === "1";
  const base = `/research/${group.id}/${post.id}`;

  const [likes, identities] = await Promise.all([
    likesFor([post.id], viewer?.id ?? null),
    resolveIdentities([post.authorId], viewer, { [post.authorId]: post.authorName }),
  ]);
  const author = identities.get(post.authorId) ?? { name: post.authorName, href: null };
  const like = likes.get(post.id) ?? { count: 0, liked: false };

  return (
    <div className={`container ${styles.articlePage}`}>
      <nav className={styles.articleCrumb} aria-label={t("Fil d'Ariane", "Breadcrumb")}>
        <Link href="/research">{t("Recherches", "Research")}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/research/${group.id}`}>{group.name}</Link>
      </nav>

      {editing ? (
        <>
          <PostComposer action={updatePost.bind(null, group.id, post.id)} post={post} cancelHref={base} />
          <div className={styles.articleDanger}>
            <ConfirmButton
              action={deletePost.bind(null, group.id, post.id, true)}
              confirm={t(
                `Supprimer « ${post.title} » et ses pièces jointes ? Cette action est définitive.`,
                `Delete “${post.title}” and its attachments? This cannot be undone.`,
              )}
            >
              {t("Supprimer la publication", "Delete the post")}
            </ConfirmButton>
          </div>
        </>
      ) : (
        <article className={styles.article}>
          <div className={styles.articleTop}>
            <PostHeader post={post} author={author} kicker={post.category ?? group.name} as="h1" full />
            {writer && (
              <Button href={`${base}?edit=1`} size="sm" variant="glass">
                {t("Éditer", "Edit")}
              </Button>
            )}
          </div>

          <PostDocuments attachments={post.attachments} />

          <div className={styles.articleBody}>{post.body}</div>

          {post.link && (
            <a className={styles.link} href={post.link} target="_blank" rel="noopener noreferrer nofollow ugc">
              {post.link}
            </a>
          )}

          <div className={styles.postFoot}>
            <LikeButton
              groupId={group.id}
              postId={post.id}
              count={like.count}
              liked={like.liked}
              canLike={!!viewer?.hasPseudo}
            />
            {post.updatedAt && <span className={styles.updated}>{t("Modifiée", "Edited")}</span>}
          </div>
        </article>
      )}
    </div>
  );
}
