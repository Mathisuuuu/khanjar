import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { GroupForm } from "@/components/research/GroupForm";
import styles from "@/components/research/Research.module.css";
import { getT } from "@/lib/i18n/server";
import { requireViewer } from "@/lib/viewer";
import { createGroup } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Nouveau groupe de recherche", "New research group") };
}

export default async function NewGroupPage() {
  const viewer = await requireViewer("/recherches/nouveau");
  const t = await getT();

  return (
    <>
      <PageHeader crumb={t("Nouveau groupe", "New group")} title={t("Nouveau groupe", "New group")}>
        {t(
          "Un groupe rassemble des publications sur un même sujet. Tu en es le propriétaire : tu choisis qui peut lire, publier et supprimer.",
          "A group brings together posts on the same topic. You own it: you choose who can read, post and delete.",
        )}
      </PageHeader>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 96, maxWidth: 720 }}>
        <div className={styles.panel}>
          <div className={styles.panelBody}>
            <GroupForm action={createGroup} canChooseKind={viewer.isTeam} submitLabel={t("Créer le groupe", "Create the group")} />
          </div>
        </div>
      </div>
    </>
  );
}
