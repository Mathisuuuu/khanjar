import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { isProviderConfigured, oauthProviders } from "@/lib/auth/providers";
import { getT } from "@/lib/i18n/server";
import { safeCallbackUrl } from "@/lib/auth/safe-redirect";
import { getViewer } from "@/lib/auth/viewer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Connexion", "Sign in"),
    description: t(
      "Connecte-toi à Griffin Lab avec Discord, Google ou ton e-mail.",
      "Sign in to Griffin Lab with Discord, Google or your email.",
    ),
  };
}

type Props = { searchParams: Promise<{ callbackUrl?: string; verified?: string; reset?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  // page à rejoindre après la connexion (ex. /submit), chemins internes uniquement
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  // session valide uniquement : une session révoquée (compte banni, mot de passe changé) reste sur cette page
  if (await getViewer()) redirect(callbackUrl);

  const providers = oauthProviders.map((p) => ({ id: p.id, label: p.label, enabled: isProviderConfigured(p.id) }));

  return (
    <div className="container" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <AuthPanel providers={providers} callbackUrl={callbackUrl} verified={params.verified === "1"}
        reset={params.reset === "1"}
      />
    </div>
  );
}
