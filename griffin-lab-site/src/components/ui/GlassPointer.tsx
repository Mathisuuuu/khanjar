"use client";

import { useEffect } from "react";

/**
 * Fait suivre le reflet des éléments `.glass` sous le pointeur
 * (variables CSS --mx / --my). Monté une seule fois dans le layout.
 */
export function GlassPointer() {
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".glass") : null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      target.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}
