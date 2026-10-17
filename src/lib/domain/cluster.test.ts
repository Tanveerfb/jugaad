import { describe, expect, it } from "vitest";
import { clusterVectors, mulberry32 } from "./cluster";
import { normalise } from "./vectors";

/** `count` unit vectors scattered tightly around `centre`. */
function blob(centre: number[], count: number, spread: number, random: () => number): number[][] {
  return Array.from({ length: count }, () => normalise(centre.map((x) => x + (random() - 0.5) * spread)));
}

function groupsOf(labels: number[]): number[][] {
  const groups = new Map<number, number[]>();
  labels.forEach((l, i) => groups.set(l, [...(groups.get(l) ?? []), i]));
  return [...groups.values()];
}

describe("clustering embeddings", () => {
  const random = mulberry32(7);
  const invoices = blob([1, 0, 0, 0, 0, 0], 20, 0.3, random);
  const photos = blob([0, 1, 0, 0, 0, 0], 25, 0.3, random);
  const installers = blob([0, 0, 1, 0, 0, 0], 15, 0.3, random);

  it("finds three clear groups, and keeps each one whole", () => {
    const labels = clusterVectors([...invoices, ...photos, ...installers]);
    const groups = groupsOf(labels).map((g) => g.length).sort((a, b) => a - b);
    expect(groups).toEqual([15, 20, 25]);
    expect(new Set(labels.slice(0, 20)).size).toBe(1);
  });

  it("gives the same answer every time", () => {
    const all = [...invoices, ...photos, ...installers];
    expect(clusterVectors(all)).toEqual(clusterVectors(all));
  });

  it("keeps a handful of files together rather than splitting them arbitrarily", () => {
    expect(clusterVectors(invoices.slice(0, 3))).toEqual([0, 0, 0]);
  });

  it("returns one group when there is no real structure", () => {
    const noise = blob([1, 1, 1, 1, 1, 1], 30, 0.05, random);
    expect(new Set(clusterVectors(noise)).size).toBe(1);
  });

  it("samples large sets and still labels every vector", () => {
    const many = [...blob([1, 0, 0], 400, 0.3, random), ...blob([0, 1, 0], 400, 0.3, random)];
    const labels = clusterVectors(many, { sampleSize: 200 });
    expect(labels).toHaveLength(800);
    expect(groupsOf(labels).map((g) => g.length).sort()).toEqual([400, 400]);
  });
});

describe("twin clusters", () => {
  it("joins groups that are really one, keeping clearly different ones apart", () => {
    const random = mulberry32(11);
    // two blobs a hair apart (one group k-means might split) and one far away
    const a = blob([1, 0.05, 0, 0, 0, 0], 25, 0.2, random);
    const b = blob([1, -0.05, 0, 0, 0, 0], 25, 0.2, random);
    const far = blob([0, 0, 1, 0, 0, 0], 25, 0.2, random);
    const labels = clusterVectors([...a, ...b, ...far]);
    expect(new Set(labels.slice(0, 50)).size).toBe(1);
    expect(labels[0]).not.toBe(labels[60]);
  });
});
