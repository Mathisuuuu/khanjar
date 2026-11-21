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
import { kindLabels, roleLabels, visibilityLabels } from "@/lib/research/types";
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
  return { title: found ? found.group.name : "Recherches" };
}

export default async function GroupPage({ params, searchParams }: Props) {
  const [{ id }, { edition }] = await Promise.all([params, searchParams]);
  const found = await loadReadable(id);
  if (!found) notFound();
  const { group, viewer } = found;

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
      <PageHeader crumb="Recherches" title={group.name}>
        {group.description || `Groupe ${visibilityLabels[group.visibility].toLowerCase()} créé par ${ownerName}.`}
      </PageHeader>

      <div className={`container ${styles.groupLayout}`}>
        <div className={styles.feed}>
          <div className={styles.feedBar}>
            <h2>
              {posts.length} publication{posts.length > 1 ? "s" : ""}
            </h2>
            {writer &&
              (editing ? (
                <Button href={`/recherches/${group.id}`} size="sm">
                  Terminer l&apos;édition
                </Button>
              ) : (
                <Button href={`/recherches/${group.id}?edition=1`} size="sm" variant="glass">
                  Éditer
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
              <b>Aucune publication</b>
              {writer
                ? editing
                  ? "Publie la première : un texte, un PDF, un script…"
                  : "Clique sur « Éditer » pour publier la première."
                : "Ce groupe n'a encore rien publié."}
            </div>
          )}
        </div>

        <aside className={styles.side}>
          <section className={styles.panel} aria-labelledby="about-title">
            <div className={styles.panelHead}>
              <h2 id="about-title">Le groupe</h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.badges}>
                <span className={`${styles.badge} ${group.kind === "official" ? styles.official : ""}`}>
                  {kindLabels[group.kind]}
                </span>
                <span className={`${styles.badge} ${group.visibility === "private" ? styles.private : ""}`}>
                  {visibilityLabels[group.visibility]}
                </span>
              </div>
              <p className={styles.note}>
                Propriétaire : {ownerName}
                <br />
                {group.members.length} membre{group.members.length > 1 ? "s" : ""} · {posts.length} publication
                {posts.length > 1 ? "s" : ""}
                {role && role !== "owner" && (
                  <>
                    <br />
                    Ton rôle : {roleLabels[role]}
                  </>
                )}
                {viewer?.isAdmin && role !== "owner" && (
                  <>
                    <br />
                    Accès administrateur : tu peux tout modifier et supprimer.
                  </>
                )}
              </p>
              {!viewer && (
                <Button href={`/connexion?callbackUrl=/recherches/${group.id}`} size="sm" variant="glass">
                  Se connecter
                </Button>
              )}
              {role && role !== "owner" && viewer?.email && (
                <ConfirmButton
                  action={removeMember.bind(null, group.id, viewer.email)}
                  confirm="Quitter ce groupe ? Tu n'y auras plus accès s'il est privé."
                >
                  Quitter le groupe
                </ConfirmButton>
              )}
            </div>
          </section>

          {owner && editing && (
            <>
              <MembersPanel groupId={group.id} members={group.members} />

              <section className={styles.panel} aria-labelledby="settings-title">
                <div className={styles.panelHead}>
                  <h2 id="settings-title">Réglages</h2>
                </div>
                <div className={styles.panelBody}>
                  <GroupForm
                    action={updateGroupSettings.bind(null, group.id)}
                    initial={{ name: group.name, description: group.description, visibility: group.visibility }}
                    submitLabel="Enregistrer"
                  />
                  <ConfirmButton
                    action={deleteGroup.bind(null, group.id)}
                    confirm={`Supprimer « ${group.name} », ses publications et ses fichiers ? Cette action est définitive.`}
                  >
                    Supprimer le groupe
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
