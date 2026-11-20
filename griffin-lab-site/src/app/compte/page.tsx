import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/Button";
import { BrandIcon, type BrandName } from "@/components/ui/BrandIcon";
import { site } from "@/content/site";
import { VisibilityForm } from "@/components/auth/VisibilityForm";
import { getVisibility, profileHref } from "@/lib/users/identity";
import { getViewer } from "@/lib/viewer";
import { signOutAction } from "../connexion/actions";
import styles from "./compte.module.css";

export const metadata: Metadata = { title: "Mon compte" };

const providerLabels: Record<string, string> = {
  credentials: "E-mail",
  discord: "Discord",
  google: "Google",
  apple: "Apple",
  github: "GitHub",
};

export default async function ComptePage() {
  const [session, viewer] = await Promise.all([auth(), getViewer()]);
  if (!session || !viewer) redirect("/connexion");
  if (!viewer.hasPseudo) redirect("/bienvenue?callbackUrl=/compte");

  const visibility = await getVisibility(viewer.id);
  const { email, image, provider } = session.user;
  const displayName = viewer.name;
  const isBrand = ["discord", "google", "apple", "github"].includes(provider);

  return (
    <div className="container" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div className={styles.card}>
        <div className={styles.profile}>
          {image ? (
            // avatar fourni par Discord / Google : domaine externe, pas d'optimisation Next
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className={styles.avatar} />
          ) : (
            <span className={styles.avatar}>{displayName.charAt(0).toUpperCase()}</span>
          )}
          <div className={styles.identity}>
            <h1>{displayName}</h1>
            {email && <span>{email}</span>}
            <Link href="/bienvenue?changer=1&callbackUrl=/compte" className={styles.change}>
              Changer de pseudo
            </Link>
          </div>
          <span className={styles.provider}>
            {isBrand && <BrandIcon name={provider as BrandName} size={14} />}
            {providerLabels[provider] ?? provider}
          </span>
        </div>

        <VisibilityForm current={visibility} />

        <div className={styles.actions}>
          <Button href="/proposer">Proposer une stratégie</Button>
          <Button href={profileHref(viewer.name)} variant="glass">
            Mon profil
          </Button>
          {viewer.isAdmin && (
            <Button href="/admin" variant="glass">
              Administration
            </Button>
          )}
          <form action={signOutAction}>
            <Button type="submit" variant="glass">
              Se déconnecter
            </Button>
          </form>
        </div>

        <a href={site.discordUrl} target="_blank" rel="noopener noreferrer" className={styles.discord}>
          <BrandIcon name="discord" size={24} />
          <span>
            <b>Rejoins le Discord</b>
            <small>Échange avec les autres contributeurs et suis les stratégies validées.</small>
          </span>
        </a>
      </div>
    </div>
  );
}
