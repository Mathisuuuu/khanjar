import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { isProviderConfigured, oauthProviders } from "@/lib/auth-providers";
import { safeCallbackUrl } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi à Griffin Lab avec Discord, Google, Apple, GitHub ou ton e-mail.",
};

type Props = { searchParams: Promise<{ callbackUrl?: string; verifie?: string; reinitialise?: string }> };

export default async function ConnexionPage({ searchParams }: Props) {
  const params = await searchParams;
  // page à rejoindre après la connexion (ex. /proposer), chemins internes uniquement
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  if (await auth()) redirect(callbackUrl);

  const providers = oauthProviders.map((p) => ({ id: p.id, label: p.label, enabled: isProviderConfigured(p.id) }));

  return (
    <div className="container" style={{ paddingTop: 56, paddingBottom: 96 }}>
      <AuthPanel providers={providers} callbackUrl={callbackUrl} verified={params.verifie === "1"}
        reset={params.reinitialise === "1"}
      />
    </div>
  );
}
