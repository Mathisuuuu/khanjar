import Link from "next/link";
import { deletePost } from "@/app/recherches/actions";
import { formatFileSize } from "@/lib/research/files";
import type { Attachment, ResearchPost } from "@/lib/research/types";
import { ConfirmButton } from "./ConfirmButton";
import { LikeButton } from "./LikeButton";
import { PdfShelf } from "./PdfShelf";
import styles from "./Research.module.css";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const fileKinds = { pdf: "PDF", script: "Script", notebook: "Notebook", data: "Données" } as const;

type Author = { name: string; href: string | null };

/** Temps de lecture estimé (200 mots par minute). */
export function readingTime(post: Pick<ResearchPost, "body" | "summary">) {
  const words = `${post.summary ?? ""} ${post.body}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Chapô : celui saisi, sinon le début du texte coupé proprement. */
function leadOf(post: Pick<ResearchPost, "body" | "summary">, max = 220) {
  if (post.summary) return post.summary;
  const text = post.body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max) > 0 ? text.lastIndexOf(" ", max) : max)}…`;
}

/**
 * En-tête d'une publication façon article : surtitre, titre, chapô, puis
 * « auteur · date · temps de lecture ».
 */
export function PostHeader({
  post,
  author,
  kicker,
  href,
  as: Title = "h3",
  full,
}: {
  post: ResearchPost;
  author: Author;
  kicker: string;
  /** Lien vers la publication (aperçu dans la liste). */
  href?: string;
  as?: "h1" | "h3";
  /** Sur la page de la publication : le chapô n'est affiché que s'il a été saisi. */
  full?: boolean;
}) {
  const lead = full ? post.summary : leadOf(post);
  return (
    <header className={styles.articleHead}>
      <span className={styles.kicker}>{kicker}</span>
      <Title className={Title === "h1" ? styles.articleTitleLarge : styles.articleTitle}>
        {href ? <Link href={href}>{post.title}</Link> : post.title}
      </Title>
      {lead && <p className={styles.articleLead}>{lead}</p>}
      <p className={styles.articleMeta}>
        {author.href ? (
          <Link href={author.href} className={styles.authorLink}>
            {author.name}
          </Link>
        ) : (
          <span>{author.name}</span>
        )}
        <span aria-hidden="true">·</span>
        <time dateTime={post.createdAt}>{dateFormat.format(new Date(post.createdAt))}</time>
        <span aria-hidden="true">·</span>
        <span>{readingTime(post)} min de lecture</span>
      </p>
    </header>
  );
}

/** Documents d'une publication, toujours présentés de la même façon : lecteur PDF puis liste des fichiers. */
export function PostDocuments({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) return null;
  const pdfs = attachments.filter((file) => file.kind === "pdf");
  return (
    <div className={styles.documents}>
      <span className={styles.documentsTitle}>
        {attachments.length} document{attachments.length > 1 ? "s" : ""}
      </span>
      {pdfs.length > 0 && <PdfShelf files={pdfs.map(({ id, name }) => ({ id, name }))} />}
      <ul className={styles.files} aria-label="Documents">
        {attachments.map((file) => (
          <li key={file.id}>
            <a
              className={styles.file}
              href={`/api/recherches/fichiers/${file.id}`}
              {...(file.kind === "pdf" ? { target: "_blank", rel: "noopener" } : { download: file.name })}
            >
              <span className={styles.fileKind}>{fileKinds[file.kind]}</span>
              <span>{file.name}</span>
              <small>{formatFileSize(file.size)}</small>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

type PostCardProps = {
  post: ResearchPost;
  groupName: string;
  author: Author;
  likes: { count: number; liked: boolean };
  canLike: boolean;
  /** Mode édition : boutons Modifier et Supprimer. */
  editing: boolean;
};

/** Aperçu d'une publication dans la page du groupe ; le titre ouvre la publication. */
export function PostCard({ post, groupName, author, likes, canLike, editing }: PostCardProps) {
  const href = `/recherches/${post.groupId}/${post.id}`;
  return (
    <article className={styles.post}>
      <PostHeader post={post} author={author} kicker={post.category ?? groupName} href={href} />
      <PostDocuments attachments={post.attachments} />
      <div className={styles.postFoot}>
        <LikeButton groupId={post.groupId} postId={post.id} count={likes.count} liked={likes.liked} canLike={canLike} />
        <Link href={href} className={styles.readMore}>
          Lire
        </Link>
        {editing && (
          <span className={styles.editActions}>
            <Link href={`${href}?edition=1`} className={styles.editLink}>
              Modifier
            </Link>
            <ConfirmButton
              action={deletePost.bind(null, post.groupId, post.id, false)}
              confirm={`Supprimer « ${post.title} » et ses pièces jointes ? Cette action est définitive.`}
            >
              Supprimer
            </ConfirmButton>
          </span>
        )}
      </div>
    </article>
  );
}
