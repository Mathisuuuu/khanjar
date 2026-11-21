import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmButton } from "@/components/research/ConfirmButton";
import { GroupForm } from "@/components/research/GroupForm";
import { MembersPanel } from "@/components/research/MembersPanel";
import { PostCard } from "@/components/research/PostCard";
import { PostComposer } from "@/components/research/PostComposer";
import styles from "@/components/research/Research.module.css";
import { Button } from "@/components/ui/Button";
import { canManage, canRead, canWrite, roleOf } from "@/lib/research/access";
import { likesFor } from "@/lib/likes";
import { getResearchRepository } from "@/lib/research/repository";
import { resolveIdentities } from "@/lib/users/identity";
import { kindLabels, kindLabelsEn, roleLabels, roleLabelsEn, visibilityLabels, visibilityLabelsEn } from "@/lib/research/types";
import { getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";
import { createPost, deleteGroup, removeMember, updateGroupSettings } from "../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ edition?: string }> };

async function loadReadable(id: string) {
  const [group, viewer] = await Promise.all([getResearchRepository().getGroup(id), getViewer()]);
  // un groupe privé est introuvable pour qui n'en est pas membre
  if (!group || !canRead(group, viewer)) return null;
  return { group, viewer };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await loadReadable((await params).id);
  const t = await getT();
  return { title: found ? found.group.name : t("Recherches", "Research") };
}

export default async function GroupPage({ params, searchParams }: Props) {
  const [{ id }, { edition }] = await Promise.all([params, searchParams]);
  const found = await loadReadable(id);
  if (!found) notFound();
  const { group, viewer } = found;
  const t = await getT();
  const kinds = t(kindLabels, kindLabelsEn);
  const visibilities = t(visibilityLabels, visibilityLabelsEn);
  const roles = t(roleLabels, roleLabelsEn);

  const posts = await getResearchRepository().listPosts(group.id);
  const [likes, identities] = await Promise.all([
    likesFor(
      posts.map((post) => post.id),
      viewer?.id ?? null,
    ),
    // noms affichés selon le réglage d'anonymat de chaque auteur (et du propriétaire)
    resolveIdentities([group.ownerId, ...posts.map((post) => post.authorId)], viewer, {
      [group.ownerId]: group.ownerName,
      ...Object.fromEntries(posts.map((post) => [post.authorId, post.authorName])),
    }),
  ]);
  const ownerName = identities.get(group.ownerId)?.name ?? group.ownerName;
  const role = roleOf(group, viewer);
  const writer = canWrite(group, viewer);
  const owner = canManage(group, viewer);
  // on n'écrit ni ne modifie rien hors du mode édition
  const editing = writer && edition === "1";

  return (
    <>
      <PageHeader crumb={t("Recherches", "Research")} title={group.name}>
        {group.description ||
          t(
            `Groupe ${visibilityLabels[group.visibility].toLowerCase()} créé par ${ownerName}.`,
            `${visibilityLabelsEn[group.visibility]} group created by ${ownerName}.`,
          )}
      </PageHeader>

      <div className={`container ${styles.groupLayout}`}>
        <div className={styles.feed}>
          <div className={styles.feedBar}>
            <h2>
              {posts.length} {t("publication", "post")}
              {posts.length > 1 ? "s" : ""}
            </h2>
            {writer &&
              (editing ? (
                <Button href={`/recherches/${group.id}`} size="sm">
                  {t("Terminer l'édition", "Done editing")}
                </Button>
              ) : (
                <Button href={`/recherches/${group.id}?edition=1`} size="sm" variant="glass">
                  {t("Éditer", "Edit")}
                </Button>
              ))}
          </div>

          {editing && <PostComposer action={createPost.bind(null, group.id)} />}

          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                groupName={group.name}
                editing={editing}
                author={identities.get(post.authorId) ?? { name: post.authorName, href: null }}
                likes={likes.get(post.id) ?? { count: 0, liked: false }}
                canLike={!!viewer?.hasPseudo}
              />
            ))
          ) : (
            <div className={styles.emptyCard}>
              <b>{t("Aucune publication", "No posts")}</b>
              {writer
                ? editing
                  ? t("Publie la première : un texte, un PDF, un script…", "Publish the first one: a text, a PDF, a script…")
                  : t("Clique sur « Éditer » pour publier la première.", "Click “Edit” to publish the first one.")
                : t("Ce groupe n'a encore rien publié.", "This group hasn't published anything yet.")}
            </div>
          )}
        </div>

        <aside className={styles.side}>
          <section className={styles.panel} aria-labelledby="about-title">
            <div className={styles.panelHead}>
              <h2 id="about-title">{t("Le groupe", "The group")}</h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.badges}>
                <span className={`${styles.badge} ${group.kind === "official" ? styles.official : ""}`}>
                  {kinds[group.kind]}
                </span>
                <span className={`${styles.badge} ${group.visibility === "private" ? styles.private : ""}`}>
                  {visibilities[group.visibility]}
                </span>
              </div>
              <p className={styles.note}>
                {t("Propriétaire :", "Owner:")} {ownerName}
                <br />
                {group.members.length} {t("membre", "member")}
                {group.members.length > 1 ? "s" : ""} · {posts.length} {t("publication", "post")}
                {posts.length > 1 ? "s" : ""}
                {role && role !== "owner" && (
                  <>
                    <br />
                    {t("Ton rôle :", "Your role:")} {roles[role]}
                  </>
                )}
                {viewer?.isAdmin && role !== "owner" && (
                  <>
                    <br />
                    {t("Accès administrateur : tu peux tout modifier et supprimer.", "Admin access: you can edit and delete everything.")}
                  </>
                )}
              </p>
              {!viewer && (
                <Button href={`/connexion?callbackUrl=/recherches/${group.id}`} size="sm" variant="glass">
                  {t("Se connecter", "Sign in")}
                </Button>
              )}
              {role && role !== "owner" && viewer?.email && (
                <ConfirmButton
                  action={removeMember.bind(null, group.id, viewer.email)}
                  confirm={t("Quitter ce groupe ? Tu n'y auras plus accès s'il est privé.", "Leave this group? You'll lose access if it's private.")}
                >
                  {t("Quitter le groupe", "Leave the group")}
                </ConfirmButton>
              )}
            </div>
          </section>

          {owner && editing && (
            <>
              <MembersPanel groupId={group.id} members={group.members} />

              <section className={styles.panel} aria-labelledby="settings-title">
                <div className={styles.panelHead}>
                  <h2 id="settings-title">{t("Réglages", "Settings")}</h2>
                </div>
                <div className={styles.panelBody}>
                  <GroupForm
                    action={updateGroupSettings.bind(null, group.id)}
                    initial={{ name: group.name, description: group.description, visibility: group.visibility }}
                    submitLabel={t("Enregistrer", "Save")}
                  />
                  <ConfirmButton
                    action={deleteGroup.bind(null, group.id)}
                    confirm={t(
                      `Supprimer « ${group.name} », ses publications et ses fichiers ? Cette action est définitive.`,
                      `Delete “${group.name}”, its posts and its files? This cannot be undone.`,
                    )}
                  >
                    {t("Supprimer le groupe", "Delete the group")}
                  </ConfirmButton>
                </div>
              </section>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
