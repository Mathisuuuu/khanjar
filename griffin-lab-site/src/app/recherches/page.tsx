import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { GroupCard } from "@/components/research/GroupCard";
import styles from "@/components/research/Research.module.css";
import { Button } from "@/components/ui/Button";
import { canRead, roleOf } from "@/lib/research/access";
import { getResearchRepository } from "@/lib/research/repository";
import { resolveIdentities } from "@/lib/users/identity";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = {
  title: "Recherches",
  description: "Les recherches de l'équipe Griffin Lab et celles partagées par la communauté.",
};

export default async function ResearchPage() {
  const viewer = await getViewer();
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
      Créer un groupe
    </Button>
  ) : (
    <Button href="/connexion?callbackUrl=/recherches/nouveau" size="sm" variant="glass">
      Se connecter pour partager
    </Button>
  );

  return (
    <>
      <PageHeader crumb="Recherches" title="Recherches">
        Nos travaux et ceux de la communauté : articles, PDF, scripts et données, rangés par groupe. Chaque groupe peut
        être public ou privé, avec ses propres membres.
      </PageHeader>

      <div className={`container ${styles.page}`}>
        <section className={styles.block} aria-labelledby="official-title">
          <div className={styles.blockHead}>
            <div>
              <h2 id="official-title">Recherches Griffin Lab</h2>
              <p>Publiées par l&apos;équipe.</p>
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
              <b>Bientôt en ligne</b>
              Nos premières recherches arrivent ici.
            </div>
          )}
        </section>

        <section className={styles.block} aria-labelledby="community-title">
          <div className={styles.blockHead}>
            <div>
              <h2 id="community-title">Communauté</h2>
              <p>Les groupes publics et ceux dont tu es membre.</p>
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
              <b>Aucun groupe pour l&apos;instant</b>
              Crée le premier et partage tes recherches, publiquement ou avec quelques personnes.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
