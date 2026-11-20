"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { perks } from "@/content/home";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import styles from "./Access.module.css";

/** Contrepartie : le cadenas s'ouvre quand la barre d'accès atteint 100 %. */
export function Access() {
  const reducedMotion = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(0.45);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setPercent(100);
      return;
    }
    const id = window.setInterval(() => {
      setPercent((p) => {
        const next = Math.min(p + 4, 100);
        if (next === 100) window.clearInterval(id);
        return next;
      });
    }, 56);
    return () => window.clearInterval(id);
  }, [inView, reducedMotion]);

  const open = percent === 100;

  return (
    <Section id="acces">
      <SectionHeading kicker="05 · La contrepartie" title="Ta stratégie est validée ? Le bot est à toi, à 100 %." align="center">
        Pas de palier, pas d&apos;accès partiel : une contribution validée débloque l&apos;ensemble du bot.
      </SectionHeading>

      <div ref={ref} className={`${styles.box} ${open ? styles.open : ""}`}>
        <div className={styles.lockColumn}>
          <div className={styles.lock}>
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path className={styles.shackle} d="M10 14V10a6 6 0 0 1 12 0v4" />
              <rect x="6" y="14" width="20" height="14" rx="3" />
              <circle cx="16" cy="21" r="1.6" fill="currentColor" />
            </svg>
          </div>
          <div className={styles.progress}>
            <div className={styles.progressTop}>
              <span>accès au bot</span>
              <b>{percent} %</b>
            </div>
            <div
              className={styles.track}
              role="progressbar"
              aria-label="Accès au bot"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className={styles.fill} style={{ width: inView ? "100%" : 0 }} />
            </div>
          </div>
        </div>

        <div>
          <h3 className={styles.perksTitle}>Ce que tu débloques</h3>
          <div className={styles.perks}>
            {perks.map((perk) => (
              <div key={perk.title} className={styles.perk}>
                <Icon name={perk.icon} size={20} />
                <div>
                  <b>{perk.title}</b>
                  <span>{perk.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
