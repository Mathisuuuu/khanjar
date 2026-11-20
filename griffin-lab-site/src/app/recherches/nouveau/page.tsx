import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { GroupForm } from "@/components/research/GroupForm";
import styles from "@/components/research/Research.module.css";
import { requireViewer } from "@/lib/viewer";
import { createGroup } from "../actions";

export const metadata: Metadata = { title: "Nouveau groupe de recherche" };

export default async function NewGroupPage() {
  const viewer = await requireViewer("/recherches/nouveau");

  return (
    <>
      <PageHeader crumb="Nouveau groupe" title="Nouveau groupe">
        Un groupe rassemble des publications sur un même sujet. Tu en es le propriétaire : tu choisis qui peut lire,
        publier et supprimer.
      </PageHeader>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 96, maxWidth: 720 }}>
        <div className={styles.panel}>
          <div className={styles.panelBody}>
            <GroupForm action={createGroup} canChooseKind={viewer.isTeam} submitLabel="Créer le groupe" />
          </div>
        </div>
      </div>
    </>
  );
}
