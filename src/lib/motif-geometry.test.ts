import { describe, expect, it } from "vitest";
import { HEX_RATIO, RIB_COUNT, litSegmentCount, ribLines, ringMarks, ringSegments } from "./motif-geometry";

describe("HEX_RATIO", () => {
  it("is the flat-top hexagon height-to-width ratio, √3/2", () => {
    expect(HEX_RATIO).toBeCloseTo(0.8660254, 6);
  });
});

describe("ringSegments", () => {
  it("returns one arc per rib by default, indexed in order", () => {
    const segs = ringSegments(116, 116, 92);
    expect(segs).toHaveLength(RIB_COUNT);
    expect(segs.map((s) => s.index)).toEqual([...Array(RIB_COUNT).keys()]);
  });

  it("starts the first arc just clockwise of twelve o'clock", () => {
    const [first] = ringSegments(100, 100, 50, 4, 0);
    // with no gap, the first quarter runs from the top (100,50) to the right (150,100)
    expect(first.d).toBe("M100 50 A50 50 0 0 1 150 100");
  });

  it("leaves a gap between neighbouring arcs", () => {
    const [a, b] = ringSegments(0, 0, 10, 4, 10);
    const endOfA = a.d.split(" ").slice(-2).join(" ");
    const startOfB = b.d.slice(1).split(" ").slice(0, 2).join(" ");
    expect(endOfA).not.toBe(startOfB);
  });
});

describe("litSegmentCount", () => {
  it("lights a proportional number of segments", () => {
    expect(litSegmentCount(0.5)).toBe(9);
    expect(litSegmentCount(0.62)).toBe(11);
  });

  it("clamps below 0 and above 1", () => {
    expect(litSegmentCount(-0.3)).toBe(0);
    expect(litSegmentCount(1.7)).toBe(RIB_COUNT);
  });

  it("treats a non-number as nothing lit", () => {
    expect(litSegmentCount(Number.NaN)).toBe(0);
    expect(litSegmentCount(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("ringMarks", () => {
  it("repeats dot, long bar, short bar", () => {
    const marks = ringMarks(0, 0, 10, 6, 2);
    expect(marks.map((m) => m.kind)).toEqual(["dot", "bar", "bar", "dot", "bar", "bar"]);
    const [, long, short] = marks;
    if (long.kind !== "bar" || short.kind !== "bar") throw new Error("expected bars");
    expect(long.height).toBeGreaterThan(short.height);
  });

  it("places every mark on the ring's radius", () => {
    for (const m of ringMarks(50, 50, 20, 12, 2)) {
      const [x, y] = m.kind === "dot" ? [m.cx, m.cy] : [m.ox, m.oy];
      expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(20, 1);
    }
  });
});

describe("ribLines", () => {
  it("draws one line per rib, all from the same origin above the box", () => {
    const lines = ribLines();
    expect(lines).toHaveLength(RIB_COUNT);
    expect(new Set(lines.map((l) => `${l.x1},${l.y1}`)).size).toBe(1);
    expect(lines[0].y1).toBeLessThan(0);
  });

  it("fans symmetrically about the centre line", () => {
    const lines = ribLines();
    const first = lines[0];
    const last = lines[lines.length - 1];
    expect(first.x2 - 500).toBeCloseTo(-(last.x2 - 500), 1);
  });
});
