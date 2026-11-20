import styles from "./Mascot.module.css";

/**
 * Mascotte pixel-art de Griffin Lab.
 * `MascotSprite` est monté une fois (layout) ; `Mascot` le réutilise via <use>.
 */

const SPRITE_ID = "griffin-mascot";

export function MascotSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <g id={SPRITE_ID}>
          {/* cheveux */}
          <rect x="4" y="0" width="8" height="2" fill="#3B2A1E" />
          <rect x="3" y="1" width="1" height="3" fill="#3B2A1E" />
          {/* tête */}
          <rect x="4" y="2" width="8" height="6" fill="#F2C29B" />
          <rect x="3" y="4" width="1" height="3" fill="#F2C29B" />
          <rect x="12" y="3" width="1" height="4" fill="#F2C29B" />
          <rect x="6" y="4" width="1" height="2" fill="#0F172A" />
          <rect x="10" y="4" width="1" height="2" fill="#0F172A" />
          <rect x="7" y="7" width="3" height="1" fill="#C98E6A" />
          {/* t-shirt */}
          <rect x="3" y="8" width="10" height="6" fill="#F8FAFC" />
          <rect x="3" y="8" width="10" height="1" fill="#E2E8F0" />
          {/* bras gauche */}
          <rect x="1" y="9" width="2" height="4" fill="#F8FAFC" />
          <rect x="1" y="13" width="2" height="1" fill="#F2C29B" />
          {/* bras droit (salut) */}
          <g className={styles.arm}>
            <rect x="13" y="6" width="2" height="4" fill="#F8FAFC" />
            <rect x="13" y="5" width="2" height="1" fill="#F2C29B" />
          </g>
          {/* pantalon */}
          <rect x="4" y="14" width="8" height="3" fill="#16A34A" />
          <rect x="4" y="17" width="3" height="2" fill="#16A34A" />
          <rect x="9" y="17" width="3" height="2" fill="#16A34A" />
          {/* chaussures */}
          <rect x="3" y="19" width="4" height="2" fill="#64748B" />
          <rect x="9" y="19" width="4" height="2" fill="#64748B" />
        </g>
      </defs>
    </svg>
  );
}

export function Mascot({ width = 18, className }: { width?: number; className?: string }) {
  return (
    <svg
      className={[styles.mascot, className].filter(Boolean).join(" ")}
      viewBox="0 0 16 21"
      width={width}
      height={(width * 21) / 16}
      aria-hidden="true"
    >
      <use href={`#${SPRITE_ID}`} />
    </svg>
  );
}
