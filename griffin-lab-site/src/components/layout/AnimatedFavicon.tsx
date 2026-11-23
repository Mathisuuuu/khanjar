"use client";

import { useEffect } from "react";
import { FAVICON_SIZE, drawMinitelFrame } from "@/components/ui/minitel-favicon";

/**
 * Favicon animé : l'avatar Minitel joue sa boucle complète dans l'onglet.
 * Une image est dessinée sur un petit canvas et posée en icône de la page (lien ajouté en
 * dernier, donc prioritaire sur l'icône fixe src/app/icon.svg) seulement quand elle change.
 * Safari n'anime pas les favicons : il garde l'icône fixe. Rien ne bouge non plus si le système
 * demande moins d'animations. En arrière-plan, le navigateur ralentit les minuteries : la boucle
 * suit l'horloge, elle saute donc des images sans prendre de retard.
 */
export function AnimatedFavicon() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = FAVICON_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.sizes = `${FAVICON_SIZE}x${FAVICON_SIZE}`;
    document.head.appendChild(link);

    const start = performance.now();
    let last = "";
    const tick = () => {
      const key = drawMinitelFrame(ctx, performance.now() - start);
      if (key === last) return;
      last = key;
      link.href = canvas.toDataURL("image/png");
    };
    tick();
    const timer = window.setInterval(tick, 60);
    return () => {
      window.clearInterval(timer);
      link.remove();
    };
  }, []);

  return null;
}
