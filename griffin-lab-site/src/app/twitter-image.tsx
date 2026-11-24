import { BANNER_ALT, renderBanner } from "@/lib/og/banner";

// même bannière pour X / Twitter (grande image)
export const alt = BANNER_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return renderBanner();
}
