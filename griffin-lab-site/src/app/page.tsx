import { Concept } from "@/components/home/Concept";
import { Diversification } from "@/components/home/Diversification";
import { FinalCta } from "@/components/home/FinalCta";
import { Hero } from "@/components/home/Hero";
import { Journey } from "@/components/home/Journey";
import { Loops } from "@/components/home/Loops";
import { TestScript } from "@/components/home/TestScript";

// les chiffres des books viennent de la base : la page est régénérée au plus toutes les 5 minutes
// (et tout de suite quand l'équipe les modifie sur /books)
export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <Hero />
      <div className="divider" />
      <Concept />
      <Journey />
      <TestScript />
      <Loops />
      <Diversification />
      <FinalCta />
    </>
  );
}
