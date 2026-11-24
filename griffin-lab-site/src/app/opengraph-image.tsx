import { BANNER_ALT, renderBanner } from "@/lib/og/banner";

// aperçu du lien (Discord, WhatsApp, LinkedIn…) : voir lib/og/banner.tsx
export const alt = BANNER_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderBanner();
}
