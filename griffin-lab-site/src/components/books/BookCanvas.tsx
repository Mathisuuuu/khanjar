"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { formatNumber, formatPercent } from "@/lib/shared/format";
import styles from "./Books.module.css";
import type { BookStats, CanvasGroup, CanvasMember } from "./types";

type Props = {
  name: string;
  color: string;
  members: CanvasMember[];
  groups: CanvasGroup[];
  links: { member: string; group: string }[];
  showResearch: boolean;
  stats: BookStats | null;
};

type View = { x: number; y: number; k: number };
type Point = { x: number; y: number };

type SimNode = {
  id: string;
  kind: "book" | "member" | "group";
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  fixed: boolean;
};
type SimLink = { a: string; b: string; rest: number };

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const BOOK_RADIUS = 52;
const MEMBER_RADIUS = 22;
const GROUP_RADIUS = 18;
const DRAG_THRESHOLD = 5;
const GRID = 32;
const BOOK_ID = "__book";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const short = (text: string, max = 18) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Positions de départ : membres en cercle autour du book, recherches sur un cercle extérieur, face à leurs auteurs. */
function initialPositions(members: CanvasMember[], groups: CanvasGroup[], links: Props["links"]) {
  const n = members.length;
  const ring = Math.max(170, (n * 62) / (2 * Math.PI));
  const pos = new Map<string, Point & { angle: number }>();
  members.forEach((member, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n, 1);
    pos.set(member.id, { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring, angle });
  });
  const outer = ring + 150;
  groups.forEach((group, i) => {
    const angles = links.filter((l) => l.group === group.id).map((l) => pos.get(l.member)?.angle ?? 0);
    const sx = angles.reduce((s, a) => s + Math.cos(a), 0);
    const sy = angles.reduce((s, a) => s + Math.sin(a), 0);
    const angle = Math.atan2(sy, sx) + i * 0.15; // léger décalage : la physique écarte le reste
    pos.set(group.id, { x: Math.cos(angle) * outer, y: Math.sin(angle) * outer, angle });
  });
  return { pos, ring };
}

/**
 * Canevas d'un book, avec une physique simple (ressorts sur les liens,
 * répulsion entre les ronds) : chaque rond se déplace à la souris ou au doigt,
 * les autres suivent. Molette ou pincement pour zoomer, glisser le fond pour
 * se déplacer.
 */
export function BookCanvas({ name, color, members, groups, links, showResearch, stats }: Props) {
  const t = useT();
  const locale = useLocale();
  const percent = (value: number) => formatPercent(value, 1, true, locale);
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  // le dessin reste invisible tant qu'il n'est pas centré (évite un saut au chargement)
  const [ready, setReady] = useState(false);
  const [, setFrame] = useState(0);
  const [hoverBook, setHoverBook] = useState(false);

  const research = showResearch && groups.length > 0;

  /* ---------- Simulation ---------- */

  const nodes = useRef(new Map<string, SimNode>());
  const simLinks = useMemo<SimLink[]>(() => {
    const base = members.map((m) => ({ a: BOOK_ID, b: m.id, rest: Math.max(150, (members.length * 62) / (2 * Math.PI)) }));
    return research ? [...base, ...links.map((l) => ({ a: l.member, b: l.group, rest: 140 }))] : base;
  }, [members, links, research]);

  const alpha = useRef(0);
  const raf = useRef<number | null>(null);
  const drag = useRef<{ id: string; pointerId: number; start: Point; moved: boolean } | null>(null);
  const pinned = useRef(new Set<string>());

  /** Double-clic sur un rond posé : il redevient libre et la physique le replace. */
  const unpin = (id: string) => {
    const node = nodes.current.get(id);
    if (!node || !pinned.current.delete(id)) return;
    node.fixed = false;
    heat(0.5);
  };

  const step = useCallback(() => {
    const list = [...nodes.current.values()];
    const a = alpha.current;
    // répulsion entre toutes les paires (quelques dizaines de ronds au plus)
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i];
        const q = list[j];
        let dx = q.x - p.x;
        let dy = q.y - p.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const minDist = p.r + q.r + 26;
        let force = (5200 / d2) * a;
        if (d < minDist) force += ((minDist - d) / d) * 0.5; // collision : jamais de chevauchement
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        if (!p.fixed) {
          p.vx -= fx;
          p.vy -= fy;
        }
        if (!q.fixed) {
          q.vx += fx;
          q.vy += fy;
        }
      }
    }
    // ressorts le long des liens
    for (const link of simLinks) {
      const p = nodes.current.get(link.a);
      const q = nodes.current.get(link.b);
      if (!p || !q) continue;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const force = (d - link.rest) * 0.035 * a;
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      // le book, plus lourd, bouge moins que les membres
      const wp = p.kind === "book" ? 0.25 : 1;
      const wq = q.kind === "book" ? 0.25 : 1;
      if (!p.fixed) {
        p.vx += fx * wp;
        p.vy += fy * wp;
      }
      if (!q.fixed) {
        q.vx -= fx * wq;
        q.vy -= fy * wq;
      }
    }
    // légère attraction vers le centre, frottement, déplacement
    for (const n of list) {
      if (n.fixed) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      const pull = n.kind === "book" ? 0.02 : 0.004;
      n.vx = (n.vx - n.x * pull * a) * 0.82;
      n.vy = (n.vy - n.y * pull * a) * 0.82;
      n.x += n.vx;
      n.y += n.vy;
    }
  }, [simLinks]);

  const loop = useCallback(() => {
    step();
    alpha.current *= drag.current ? 1 : 0.985;
    setFrame((f) => f + 1);
    if (alpha.current > 0.01 || drag.current) raf.current = requestAnimationFrame(loop);
    else raf.current = null;
  }, [step]);

  const heat = useCallback(
    (value: number) => {
      alpha.current = Math.max(alpha.current, value);
      if (raf.current === null) raf.current = requestAnimationFrame(loop);
    },
    [loop],
  );

  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
  }, []);

  // (re)construit les ronds : on garde la position de ceux qui existent déjà
  useEffect(() => {
    const { pos } = initialPositions(members, research ? groups : [], links);
    const next = new Map<string, SimNode>();
    const keep = (id: string, kind: SimNode["kind"], r: number, start: Point) => {
      const old = nodes.current.get(id);
      next.set(id, old ? { ...old, r } : { id, kind, r, x: start.x, y: start.y, vx: 0, vy: 0, fixed: false });
    };
    keep(BOOK_ID, "book", BOOK_RADIUS, { x: 0, y: 0 });
    members.forEach((m) => keep(m.id, "member", MEMBER_RADIUS, pos.get(m.id)!));
    if (research) groups.forEach((g) => keep(g.id, "group", GROUP_RADIUS, pos.get(g.id)!));
    for (const id of pinned.current) if (!next.has(id)) pinned.current.delete(id);
    nodes.current = next;
    setFrame((f) => f + 1); // premier rendu sans attendre l'animation (suspendue dans un onglet caché)
    heat(0.6);
  }, [members, groups, links, research, heat]);

  /* ---------- Vue : taille, cadrage, zoom ---------- */

  // on observe le bloc qui entoure le <svg> (pour un <svg>, l'observateur mesurerait le dessin)
  useEffect(() => {
    const box = wrapRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = box.getBoundingClientRect();
      setSize((current) => (current.w === width && current.h === height ? current : { w: width, h: height }));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!size.w || !size.h) return;
    const list = [...nodes.current.values()];
    if (list.length === 0) return;
    const pad = 90;
    const minX = Math.min(...list.map((n) => n.x)) - pad;
    const maxX = Math.max(...list.map((n) => n.x)) + pad;
    const minY = Math.min(...list.map((n) => n.y)) - pad;
    const maxY = Math.max(...list.map((n) => n.y)) + pad;
    const k = clamp(Math.min(size.w / (maxX - minX), size.h / (maxY - minY)), MIN_ZOOM, 1.4);
    setView({ x: size.w / 2 - ((minX + maxX) / 2) * k, y: size.h / 2 - ((minY + maxY) / 2) * k, k });
    setReady(true);
  }, [size]);

  // recadre au chargement, au changement de book, de taille ou d'affichage des recherches
  useEffect(() => fit(), [fit, name, research]);

  const zoomAt = useCallback((factor: number, at: Point) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM);
      const ratio = k / v.k;
      return { k, x: at.x - (at.x - v.x) * ratio, y: at.y - (at.y - v.y) * ratio };
    });
  }, []);

  // molette : écouteur non passif pour empêcher le défilement de la page
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.0015), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /* ---------- Gestes : déplacer un rond, déplacer le fond, pincer ---------- */

  const pointers = useRef(new Map<number, Point>());
  const pan = useRef<{ start: Point; view: View; dist?: number; mid?: Point; moved: boolean } | null>(null);

  /** Garde le pointeur sur le canevas pendant un geste (sans effet si le navigateur refuse). */
  const capture = (pointerId: number) => {
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      // pointeur déjà relâché
    }
  };

  const local = (event: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const toWorld = (p: Point): Point => {
    const v = viewRef.current;
    return { x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k };
  };

  /** Appui sur un rond : il suit le pointeur ; sans déplacement, c'est un clic. */
  const onNodeDown = (id: string) => (event: PointerEvent<SVGGElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.stopPropagation();
    const node = nodes.current.get(id);
    if (!node) return;
    capture(event.pointerId);
    drag.current = { id, pointerId: event.pointerId, start: local(event), moved: false };
    node.fixed = true;
    heat(0.3);
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (drag.current) return;
    if (event.isPrimary) pointers.current.clear(); // un relâchement perdu ne bloque pas la suite
    pointers.current.set(event.pointerId, local(event));
    const pts = [...pointers.current.values()];
    if (pts.length === 1) pan.current = { start: pts[0], view: viewRef.current, moved: false };
    else if (pts.length === 2) {
      const [a, b] = pts;
      pan.current = {
        start: a,
        view: viewRef.current,
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        moved: true,
      };
    }
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (d && d.pointerId === event.pointerId) {
      const p = local(event);
      if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) < DRAG_THRESHOLD) return;
      d.moved = true;
      const node = nodes.current.get(d.id);
      if (node) {
        const w = toWorld(p);
        node.x = w.x;
        node.y = w.y;
      }
      heat(0.3);
      return;
    }

    if (!pointers.current.has(event.pointerId) || !pan.current) return;
    pointers.current.set(event.pointerId, local(event));
    const pts = [...pointers.current.values()];
    const g = pan.current;

    if (pts.length >= 2 && g.dist && g.mid) {
      const [a, b] = pts;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const k = clamp((g.view.k * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist, MIN_ZOOM, MAX_ZOOM);
      const ratio = k / g.view.k;
      setView({ k, x: mid.x - (g.mid.x - g.view.x) * ratio, y: mid.y - (g.mid.y - g.view.y) * ratio });
      return;
    }

    const p = pts[0];
    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!g.moved) {
      g.moved = true;
      capture(event.pointerId);
    }
    setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
  };

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
    const d = drag.current;
    if (d && d.pointerId === event.pointerId) {
      drag.current = null;
      const node = nodes.current.get(d.id);
      // un rond déplacé reste où on l'a posé (les autres s'adaptent) ; double-clic pour le libérer
      if (node) {
        node.fixed = d.moved || pinned.current.has(d.id);
        if (d.moved) pinned.current.add(d.id);
      }
      heat(0.3);
      // appui sans déplacement : ouvre le profil ou la recherche
      if (!d.moved && event.type === "pointerup") open(hrefOf(d.id));
      return;
    }
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) pan.current = null;
    else {
      const [rest] = [...pointers.current.values()];
      pan.current = { start: rest, view: viewRef.current, moved: true };
    }
  };

  const hrefOf = (id: string): string | null =>
    members.find((m) => m.id === id)?.href ?? groups.find((g) => g.id === id)?.href ?? null;
  const open = (href: string | null) => {
    if (href) router.push(href);
  };
  const onKey = (href: string | null) => (event: KeyboardEvent) => {
    if (href && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      router.push(href);
    }
  };

  const onCanvasKey = (event: KeyboardEvent<SVGSVGElement>) => {
    const center = { x: size.w / 2, y: size.h / 2 };
    if (event.key === "+" || event.key === "=") zoomAt(1.2, center);
    else if (event.key === "-") zoomAt(1 / 1.2, center);
    else if (event.key === "0") fit();
  };

  /* ---------- Rendu ---------- */

  const at = (id: string) => nodes.current.get(id);
  const book = at(BOOK_ID);
  const bookScreen = book ? { x: book.x * view.k + view.x, y: (book.y - BOOK_RADIUS) * view.k + view.y } : null;
  const statsLabel = stats ? t(`, rendement sur 1 jour ${percent(stats.dayReturn)}`, `, 1-day return ${percent(stats.dayReturn)}`) : "";

  return (
    <div className={styles.canvasWrap} ref={wrapRef}>
      <svg
        ref={svgRef}
        className={styles.canvas}
        role="group"
        aria-label={t(
          `Canevas du book ${name} : ${members.length} membre${members.length > 1 ? "s" : ""}. Glisse un rond pour le déplacer, double-clic pour le libérer. Touches + et − pour zoomer, 0 pour recentrer.`,
          `Canvas of book ${name}: ${members.length} member${members.length > 1 ? "s" : ""}. Drag a circle to move it, double-click to release it. Keys + and − to zoom, 0 to recenter.`,
        )}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onCanvasKey}
      >
        <defs>
          {/* grille de points blancs, calée sur la vue : elle suit le déplacement et le zoom */}
          <pattern
            id="book-grid"
            width={GRID}
            height={GRID}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${view.x} ${view.y}) scale(${view.k})`}
          >
            <circle cx={GRID / 2} cy={GRID / 2} r={1.3} className={styles.gridDot} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#book-grid)" />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} opacity={ready ? 1 : 0}>
          {/* liens membre → recherche */}
          {research &&
            links.map((link) => {
              const a = at(link.member);
              const b = at(link.group);
              if (!a || !b) return null;
              return <line key={`${link.member}-${link.group}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.researchLink} />;
            })}

          {/* liens book → membre */}
          {book &&
            members.map((member) => {
              const p = at(member.id);
              if (!p) return null;
              return <line key={member.id} x1={book.x} y1={book.y} x2={p.x} y2={p.y} stroke={color} className={styles.memberLink} />;
            })}

          {research &&
            groups.map((group) => {
              const p = at(group.id);
              if (!p) return null;
              return (
                <g
                  key={group.id}
                  transform={`translate(${p.x} ${p.y})`}
                  className={styles.groupNode}
                  role="link"
                  tabIndex={0}
                  aria-label={t(`Recherche ${group.name}`, `Research ${group.name}`)}
                  onPointerDown={onNodeDown(group.id)}
                  onDoubleClick={() => unpin(group.id)}
                  onKeyDown={onKey(group.href)}
                >
                  <rect x={-14} y={-14} width={28} height={28} rx={7} />
                  <path d="M-6 -4h12M-6 1h12M-6 6h7" />
                  <text y={32} textAnchor="middle">
                    {short(group.name)}
                  </text>
                </g>
              );
            })}

          {members.map((member) => {
            const p = at(member.id);
            if (!p) return null;
            const label = member.self ? `${member.name} ${t("(toi)", "(you)")}` : member.name;
            return (
              <g
                key={member.id}
                transform={`translate(${p.x} ${p.y})`}
                className={`${styles.memberNode} ${styles.draggable} ${member.anonymous ? styles.anonymous : ""}`}
                onPointerDown={onNodeDown(member.id)}
                onDoubleClick={() => unpin(member.id)}
                {...(member.href
                  ? { role: "link", tabIndex: 0, "aria-label": t(`Profil de ${member.name}`, `${member.name}'s profile`), onKeyDown: onKey(member.href) }
                  : { "aria-label": label })}
              >
                <circle r={MEMBER_RADIUS} stroke={member.anonymous ? undefined : color} />
                {member.avatar ? (
                  <>
                    <clipPath id={`avatar-${member.id}`}>
                      <circle r={MEMBER_RADIUS - 2} />
                    </clipPath>
                    <image
                      href={member.avatar}
                      x={-(MEMBER_RADIUS - 2)}
                      y={-(MEMBER_RADIUS - 2)}
                      width={(MEMBER_RADIUS - 2) * 2}
                      height={(MEMBER_RADIUS - 2) * 2}
                      clipPath={`url(#avatar-${member.id})`}
                      preserveAspectRatio="xMidYMid slice"
                      style={{ pointerEvents: "none" }}
                    />
                  </>
                ) : (
                  <text y={5} textAnchor="middle" className={styles.initial}>
                    {member.anonymous ? "?" : member.name.charAt(0).toUpperCase()}
                  </text>
                )}
                <text y={MEMBER_RADIUS + 18} textAnchor="middle" className={styles.memberLabel}>
                  {short(label)}
                </text>
                {member.masked && (
                  <text y={MEMBER_RADIUS + 32} textAnchor="middle" className={styles.maskedLabel}>
                    masqué pour les autres
                  </text>
                )}
              </g>
            );
          })}

          {book && (
            <g
              transform={`translate(${book.x} ${book.y})`}
              className={`${styles.bookNode} ${styles.draggable}`}
              tabIndex={0}
              aria-label={`Book ${name}${statsLabel}`}
              onPointerDown={onNodeDown(BOOK_ID)}
              onDoubleClick={() => unpin(BOOK_ID)}
              onPointerEnter={() => setHoverBook(true)}
              onPointerLeave={() => setHoverBook(false)}
              onFocus={() => setHoverBook(true)}
              onBlur={() => setHoverBook(false)}
            >
              <circle r={BOOK_RADIUS + 10} fill={color} opacity={hoverBook ? 0.24 : 0.14} />
              <circle r={BOOK_RADIUS} fill={color} />
              <text y={BOOK_RADIUS + 26} textAnchor="middle" className={styles.bookLabel}>
                {short(name, 28)}
              </text>
            </g>
          )}

          {members.length === 0 && book && (
            <text x={book.x} y={book.y - BOOK_RADIUS - 24} textAnchor="middle" className={styles.emptyLabel}>
              Aucun membre pour l&apos;instant
            </text>
          )}
        </g>
      </svg>

      {/* infobulle au survol du book : rendement du jour, all time et chiffres clés */}
      {hoverBook && bookScreen && (
        <div className={styles.tooltip} style={{ left: bookScreen.x, top: bookScreen.y }} role="tooltip">
          <b>{name}</b>
          {stats ? (
            <>
              <span className={styles.tooltipMain}>
                {t("Rendement 1 J", "1-day return")}{" "}
                <em className={stats.dayReturn >= 0 ? styles.up : styles.down}>{percent(stats.dayReturn)}</em>
              </span>
              {stats.allTime !== null && (
                <span>
                  All time <em className={stats.allTime >= 0 ? styles.up : styles.down}>{percent(stats.allTime)}</em>
                </span>
              )}
              {stats.weekReturn !== undefined && (
                <span>
                  {t("Sur 7 jours", "Over 7 days")}{" "}
                  <em className={stats.weekReturn >= 0 ? styles.up : styles.down}>{percent(stats.weekReturn)}</em>
                </span>
              )}
              <span>
                Sharpe {formatNumber(stats.sharpe, 2, locale)} · {t("DD max", "Max DD")} {percent(stats.maxDrawdown)} · {stats.strategies}{" "}
                {t("stratégies", "strategies")}
              </span>
            </>
          ) : (
            <span>{t("Pas encore de chiffres pour ce book.", "No figures for this book yet.")}</span>
          )}
        </div>
      )}

      <div className={styles.zoom} role="toolbar" aria-label="Zoom">
        <button type="button" onClick={() => zoomAt(1.25, { x: size.w / 2, y: size.h / 2 })} aria-label={t("Zoomer", "Zoom in")}>
          +
        </button>
        <button type="button" onClick={() => zoomAt(1 / 1.25, { x: size.w / 2, y: size.h / 2 })} aria-label={t("Dézoomer", "Zoom out")}>
          −
        </button>
        <button type="button" onClick={fit} aria-label={t("Recentrer", "Recenter")} className={styles.fit}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className={styles.zoomLevel}>{Math.round(view.k * 100)}{locale === "en" ? "" : " "}%</span>
      </div>
    </div>
  );
}
