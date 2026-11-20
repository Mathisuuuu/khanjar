"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renvoie `true` la première fois que l'élément entre dans la fenêtre.
 * Sert à lancer les animations (script de test, cadenas) au bon moment.
 */
export function useInView<T extends Element>(threshold = 0.4) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, inView]);

  return { ref, inView };
}
