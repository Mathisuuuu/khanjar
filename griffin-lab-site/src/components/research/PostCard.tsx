import Link from "next/link";
import { deletePost } from "@/app/recherches/actions";
import { formatFileSize } from "@/lib/research/files";
import type { ResearchPost } from "@/lib/research/types";
import { ConfirmButton } from "./ConfirmButton";
import { LikeButton } from "./LikeButton";
import { PdfShelf } from "./PdfShelf";
import styles from "./Research.module.css";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const kindLabels = { pdf: "PDF", script: "Script", notebook: "Notebook", data: "Données" } as const;

type PostCardProps = {
  post: ResearchPost;
  canDelete: boolean;
  /** Nom affiché de l'auteur (« Anonyme » s'il se masque) et lien vers son profil. */
  author: { name: string; href: string | null };
  likes: { count: number; liked: boolean };
  canLike: boolean;
};

/** Une publication du groupe : titre, auteur, texte, lien, pièces jointes et likes. */
export function PostCard({ post, canDelete, author, likes, canLike }: PostCardProps) {
  const pdfs = post.attachments.filter((file) => file.kind === "pdf");
  return (
    <article className={styles.post}>
      <div className={styles.postHead}>
        <div>
          <h3>{post.title}</h3>
          <p className={styles.meta}>
            {author.href ? (
              <Link href={author.href} className={styles.authorLink}>
                {author.name}
              </Link>
            ) : (
              <span>{author.name}</span>
            )}
            <time dateTime={post.createdAt}>{dateFormat.format(new Date(post.createdAt))}</time>
          </p>
        </div>
        {canDelete && (
          <ConfirmButton
            action={deletePost.bind(null, post.groupId, post.id)}
            confirm={`Supprimer « ${post.title} » et ses pièces jointes ? Cette action est définitive.`}
          >
            Supprimer
          </ConfirmButton>
        )}
      </div>

      <p className={styles.body}>{post.body}</p>

      {post.link && (
        <a className={styles.link} href={post.link} target="_blank" rel="noopener noreferrer nofollow ugc">
          {post.link}
        </a>
      )}

      {pdfs.length > 0 && <PdfShelf files={pdfs.map(({ id, name }) => ({ id, name }))} />}

      {post.attachments.length > 0 && (
        <ul className={styles.files} aria-label="Pièces jointes">
          {post.attachments.map((file) => (
            <li key={file.id}>
              <a
                className={styles.file}
                href={`/api/recherches/fichiers/${file.id}`}
                {...(file.kind === "pdf" ? { target: "_blank", rel: "noopener" } : { download: file.name })}
              >
                <span className={styles.fileKind}>{kindLabels[file.kind]}</span>
                <span>{file.name}</span>
                <small>{formatFileSize(file.size)}</small>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.postFoot}>
        <LikeButton groupId={post.groupId} postId={post.id} count={likes.count} liked={likes.liked} canLike={canLike} />
      </div>
    </article>
  );
}
