import type { ReactNode } from "react";
import styles from "./Section.module.css";

type SectionProps = {
  id?: string;
  /** `alt` : fond légèrement plus clair pour alterner les sections. */
  tone?: "default" | "alt";
  className?: string;
  children: ReactNode;
};

/** Bloc de page avec l'espacement vertical standard et un conteneur centré. */
export function Section({ id, tone = "default", className, children }: SectionProps) {
  return (
    <section id={id} className={`${styles.section} ${tone === "alt" ? styles.alt : ""}`}>
      <div className={["container", styles.content, className].filter(Boolean).join(" ")}>{children}</div>
    </section>
  );
}
