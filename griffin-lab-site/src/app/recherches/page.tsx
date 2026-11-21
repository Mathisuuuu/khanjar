import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { GroupCard } from "@/components/research/GroupCard";
import styles from "@/components/research/Research.module.css";
import { Button } from "@/components/ui/Button";
import { canRead, roleOf } from "@/lib/research/access";
import { getResearchRepository } from "@/lib/research/repository";
import { resolveIdentities } from "@/lib/users/identity";
import { getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Recherches", "Research"),
    description: t(
      "Les recherches de l'équipe Griffin Lab et celles partagées par la communauté.",
      "Research from the Griffin Lab team and research shared by the community.",
    ),
  };
}

export default async function ResearchPage() {
  const viewer = await getViewer();
  const t = await getT();
  const readable = (await getResearchRepository().listGroups()).filter((group) => canRead(group, viewer));
  // nom du propriétaire selon son réglage d'anonymat
  const owners = await resolveIdentities(
    readable.map((group) => group.ownerId),
    viewer,
    Object.fromEntries(readable.map((group) => [group.ownerId, group.ownerName])),
  );
  const groups = readable.map((group) => ({ ...group, ownerName: owners.get(group.ownerId)?.name ?? group.ownerName }));
  const official = groups.filter((group) => group.kind === "official");
  const community = groups.filter((group) => group.kind === "community");

  const createButton = viewer ? (
    <Button href="/recherches/nouveau" size="sm">
      {t("Créer un groupe", "Create a group")}
    </Button>
  ) : (
    <Button href="/connexion?callbackUrl=/recherches/nouveau" size="sm" variant="glass">
      {t("Se connecter pour partager", "Sign in to share")}
    </Button>
  );

  return (
    <>
      <PageHeader crumb={t("Recherches", "Research")} title={t("Recherches", "Research")}>
        {t(
          "Nos travaux et ceux de la communauté : articles, PDF, scripts et données, rangés par groupe. Chaque groupe peut être public ou privé, avec ses propres membres.",
          "Our work and the community's: articles, PDFs, scripts and data, organised by group. Each group can be public or private, with its own members.",
        )}
      </PageHeader>

      <div className={`container ${styles.page}`}>
        <section className={styles.block} aria-labelledby="official-title">
          <div className={styles.blockHead}>
            <div>
              <h2 id="official-title">{t("Recherches Griffin Lab", "Griffin Lab research")}</h2>
              <p>{t("Publiées par l'équipe.", "Published by the team.")}</p>
            </div>
          </div>
          {official.length > 0 ? (
            <div className={styles.grid}>
              {official.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  role={roleOf(group, viewer)}
                  reserveFan={official.some((g) => g.pdfs.length > 0)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <b>{t("Bientôt en ligne", "Coming soon")}</b>
              {t("Nos premières recherches arrivent ici.", "Our first research is on its way.")}
            </div>
          )}
        </section>

        <section className={styles.block} aria-labelledby="community-title">
          <div className={styles.blockHead}>
            <div>
              <h2 id="community-title">{t("Communauté", "Community")}</h2>
              <p>{t("Les groupes publics et ceux dont tu es membre.", "Public groups and those you're a member of.")}</p>
            </div>
            {createButton}
          </div>
          {community.length > 0 ? (
            <div className={styles.grid}>
              {community.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  role={roleOf(group, viewer)}
                  reserveFan={community.some((g) => g.pdfs.length > 0)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <b>{t("Aucun groupe pour l'instant", "No groups yet")}</b>
              {t(
                "Crée le premier et partage tes recherches, publiquement ou avec quelques personnes.",
                "Create the first one and share your research, publicly or with a few people.",
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
