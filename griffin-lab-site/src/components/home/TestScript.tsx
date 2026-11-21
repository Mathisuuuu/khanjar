"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { checks as checkList, terminalScript as terminalLines } from "@/content/home";
import { useT } from "@/components/i18n/LocaleProvider";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import styles from "./TestScript.module.css";

const TYPE_MS = 38; // délai entre deux caractères d'une commande
const LINE_MS = 520; // délai entre deux lignes de sortie
const RESTART_MS = 4200; // pause avant de relancer le test

/**
 * Terminal qui joue un faux test, en boucle, pendant que les contrôles
 * à droite se valident au même rythme que les lignes « ✓ ».
 */
export function TestScript() {
  const t = useT();
  const terminalScript = useMemo(() => terminalLines(t), [t]);
  const checks = useMemo(() => checkList(t), [t]);
  const reducedMotion = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const [line, setLine] = useState(0); // ligne en cours d'écriture
  const [chars, setChars] = useState(0); // caractères tapés sur la ligne en cours
  const bodyRef = useRef<HTMLDivElement>(null);

  const finished = line >= terminalScript.length;

  // Avance d'un pas : un caractère pour une commande, une ligne entière sinon.
  useEffect(() => {
    if (!inView || reducedMotion) return;

    if (finished) {
      const id = window.setTimeout(() => {
        setLine(0);
        setChars(0);
      }, RESTART_MS);
      return () => window.clearTimeout(id);
    }

    const current = terminalScript[line];
    const typing = current.kind === "command" && chars < current.text.length;
    const id = window.setTimeout(
      () => {
        if (typing) {
          setChars((c) => c + 1);
        } else {
          setLine((l) => l + 1);
          setChars(0);
        }
      },
      typing ? TYPE_MS : LINE_MS,
    );
    return () => window.clearTimeout(id);
  }, [inView, reducedMotion, line, chars, finished, terminalScript]);

  // Garde la dernière ligne visible
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [line]);

  // Sans animation : tout le test est affiché d'emblée
  const shownLines = reducedMotion ? terminalScript.length : line;

  const validated = new Set(
    terminalScript.slice(0, shownLines).flatMap((l) => (l.validates === undefined ? [] : [l.validates])),
  );
  const running = inView && !reducedMotion && !finished;
  const nextCheck = checks.findIndex((_, i) => !validated.has(i));

  return (
    <Section id="test">
      <SectionHeading
        kicker={t("03 · Le script de test", "03 · The test script")}
        title={t("Sept contrôles quantitatifs. Aucun passe-droit.", "Seven quantitative checks. No exceptions.")}
      >
        {t(
          "Chaque stratégie est évaluée par le même pipeline : robustesse, hors échantillon, anti-surapprentissage, pouvoir prédictif (IC), risque, stress statistique et apport réel au portefeuille.",
          "Every strategy is assessed by the same pipeline: robustness, out of sample, anti-overfitting, predictive power (IC), risk, statistical stress and real contribution to the portfolio.",
        )}
      </SectionHeading>

      <div className={styles.grid} ref={ref}>
        <div className={styles.terminal}>
          <div className={styles.terminalHead}>
            <span className={styles.lights} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>bash</span>
          </div>
          <div className={styles.terminalBody} ref={bodyRef} aria-hidden="true">
            {terminalScript.slice(0, shownLines).map((l, i) => (
              <TerminalRow key={i} kind={l.kind} text={l.text} />
            ))}
            {!reducedMotion && !finished && (
              <TerminalRow
                kind={terminalScript[line].kind}
                text={terminalScript[line].kind === "command" ? terminalScript[line].text.slice(0, chars) : ""}
                cursor
              />
            )}
            {(finished || reducedMotion) && <TerminalRow kind="command" text="" cursor />}
          </div>
          <p className="visually-hidden">
            {t("Exemple de test :", "Test example:")} {terminalScript.map((l) => l.text).join(". ")}
          </p>
        </div>

        <ul className={styles.checks} aria-label={t("Contrôles du script de test", "Test script checks")}>
          {checks.map((check, i) => {
            const done = validated.has(i);
            const active = running && i === nextCheck;
            return (
              <li key={check.name} className={`${styles.check} ${done ? styles.done : ""} ${active ? styles.active : ""}`}>
                <span className={styles.status}>
                  <Icon name="check" size={14} strokeWidth={3} />
                </span>
                <span className={styles.name}>{check.name}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

function TerminalRow({ kind, text, cursor = false }: { kind: string; text: string; cursor?: boolean }) {
  return (
    <div className={`${styles.line} ${styles[kind] ?? ""}`}>
      {kind === "command" && <span className={styles.prompt}>$ </span>}
      {text}
      {cursor && <span className={styles.cursor} />}
    </div>
  );
}
