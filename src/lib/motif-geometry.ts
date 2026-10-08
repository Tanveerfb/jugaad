/*
 * Pure geometry for the "Honeycomb console" motif (design-system.md). No React, no DOM —
 * shared by the hexagon tiles, the rotor and the background ribs.
 */

/** Flat-top hexagon height as a fraction of its width (√3 / 2). */
export const HEX_RATIO = Math.sqrt(3) / 2;

/** viewBox for every hexagon frame: width 200, height 200 × HEX_RATIO. */
export const HEX_VIEWBOX = `0 0 200 ${(200 * HEX_RATIO).toFixed(1)}`;

/**
 * Flat-top hexagon path inside HEX_VIEWBOX, inset 2 units so a stroke is never clipped.
 * Used with pathLength="100" so the chasing light works at any size.
 */
export const HEX_PATH = "M51 2 H149 L198 86.6 L149 171.2 H51 L2 86.6 Z";

/** The 2012 console room has 18 ribs; the rotor and the background both use them. */
export const RIB_COUNT = 18;

export type ArcSegment = { d: string; index: number };

/**
 * Splits a circle into `count` arcs with a small angular gap between them, starting at the
 * top and running clockwise.
 */
export function ringSegments(
  cx: number,
  cy: number,
  r: number,
  count: number = RIB_COUNT,
  gapDegrees: number = 3,
): ArcSegment[] {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const step = 360 / count;
  return Array.from({ length: count }, (_, index) => {
    const a0 = toRad(index * step + gapDegrees / 2);
    const a1 = toRad((index + 1) * step - gapDegrees / 2);
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    return { index, d: `M${round(x0)} ${round(y0)} A${r} ${r} 0 0 1 ${round(x1)} ${round(y1)}` };
  });
}

/** How many of `count` segments a progress value lights, clamped to 0…count. */
export function litSegmentCount(progress: number, count: number = RIB_COUNT): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(count, Math.max(0, Math.round(progress * count)));
}

export type RingMark =
  | { kind: "dot"; cx: number; cy: number; r: number }
  | { kind: "bar"; x: number; y: number; width: number; height: number; rotate: number; ox: number; oy: number };

/**
 * Original decorative marks around a ring — a repeating dot / long bar / short bar pattern.
 * Deliberately not a script: the motif forbids real Gallifreyan writing (design-system.md).
 */
export function ringMarks(cx: number, cy: number, r: number, count: number, size: number): RingMark[] {
  return Array.from({ length: count }, (_, i) => {
    const deg = ((i + 0.5) * 360) / count;
    const a = ((deg - 90) * Math.PI) / 180;
    const x = round(cx + r * Math.cos(a));
    const y = round(cy + r * Math.sin(a));
    const kind = i % 3;
    if (kind === 0) return { kind: "dot", cx: x, cy: y, r: round(size * 0.7) };
    const width = kind === 1 ? size * 0.5 : size;
    const height = kind === 1 ? size * 2 : size * 1.2;
    return {
      kind: "bar",
      x: round(x - width / 2),
      y: round(y - height / 2),
      width: round(width),
      height: round(height),
      rotate: round(deg),
      ox: x,
      oy: y,
    };
  });
}

export type Line = { x1: number; y1: number; x2: number; y2: number };

/**
 * The background ribs: RIB_COUNT lines fanning down from a point above a 1000×1000 box,
 * spread across `spreadDegrees`.
 */
export function ribLines(spreadDegrees: number = 104): Line[] {
  const ox = 500;
  const oy = -550;
  const len = 3200;
  const start = 90 - spreadDegrees / 2;
  return Array.from({ length: RIB_COUNT }, (_, i) => {
    const a = ((start + (i * spreadDegrees) / (RIB_COUNT - 1)) * Math.PI) / 180;
    return { x1: ox, y1: oy, x2: round(ox + len * Math.cos(a)), y2: round(oy + len * Math.sin(a)) };
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
