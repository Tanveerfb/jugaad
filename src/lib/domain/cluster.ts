import { dot, normalise } from "./vectors";

/**
 * Groups unit vectors (file embeddings) into clusters — the raw material of suggested
 * categories (spec, Organiser step 3). Spherical k-means: similarity is the dot product,
 * a centre is the normalised mean. The number of clusters is chosen by the silhouette score,
 * which rewards groups that are tight inside and far apart. Seeded, so the same files always
 * give the same suggestions.
 */

export type ClusterOptions = {
  /** Most clusters to consider. More than a dozen categories stops being a tidy folder. */
  maxClusters?: number;
  /** Silhouette is O(n²); above this many vectors it is measured on a sample. */
  sampleSize?: number;
  seed?: number;
};

/** Silhouettes this close to the best count as a tie, and a tie goes to more clusters. */
const TIE = 0.02;
/** Below this, real embeddings show no group structure worth suggesting. */
const NO_STRUCTURE = 0.15;
/** k-means runs per cluster count; the tightest is kept. */
const RESTARTS = 8;

/**
 * Cluster index per input vector, in input order.
 *
 * Tuned on the sample folder with `qwen3-embedding:0.6b` (decisions.md, 2026-10-17): vectors are
 * centred first — embeddings share a common direction that makes everything look alike — then
 * each cluster count gets several k-means runs, and among counts whose silhouette is within
 * `TIE` of the best the largest wins. An extra category is easy for the owner to reject or
 * rename; two kinds of file merged into one is harder to spot.
 */
export function clusterVectors(vectors: readonly number[][], options: ClusterOptions = {}): number[] {
  const { maxClusters = 12, sampleSize = 600, seed = 42 } = options;
  const n = vectors.length;
  if (n < 4) return vectors.map(() => 0);

  // files that all say nearly the same thing are one group, however k-means would split them
  const centre = normalise(mean(vectors));
  if (vectors.every((v) => dot(v, centre) > 0.97)) return vectors.map(() => 0);
  const centred = vectors.map((v) => normalise(v.map((x, d) => x - centre[d])));

  const random = mulberry32(seed);
  const sample = n <= sampleSize ? centred.map((_, i) => i) : pick(n, sampleSize, random);
  const sampled = sample.map((i) => centred[i]);
  const most = Math.min(maxClusters, Math.floor(sampled.length / 2));

  const scores: { k: number; score: number }[] = [];
  for (let k = 2; k <= most; k++) {
    scores.push({ k, score: silhouette(sampled, tightest(sampled, k, seed).labels, k) });
  }
  const top = Math.max(...scores.map((s) => s.score));
  if (scores.length === 0 || top < NO_STRUCTURE) return vectors.map(() => 0);
  const k = scores.filter((s) => s.score >= top - TIE).at(-1)!.k;
  return mergeNearTwins(centred, tightest(centred, k, seed));
}

/**
 * Clusters whose centres point almost the same way are one group that k-means split; they are
 * joined before naming. On the owner's Downloads the closest real pair scored 0.50, so 0.6
 * only catches true twins. Labels come back renumbered from 0.
 */
const TWINS = 0.6;

function mergeNearTwins(vectors: readonly number[][], { labels, centres }: { labels: number[]; centres: number[][] }): number[] {
  const parent = centres.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  const unit = centres.map((c) => normalise(c));
  for (let a = 0; a < unit.length; a++) {
    for (let b = a + 1; b < unit.length; b++) if (dot(unit[a], unit[b]) > TWINS) parent[root(b)] = root(a);
  }
  const renumber = new Map<number, number>();
  return vectors.map((_, i) => {
    const r = root(labels[i]);
    if (!renumber.has(r)) renumber.set(r, renumber.size);
    return renumber.get(r)!;
  });
}

/** The best of several k-means runs: the one whose points sit closest to their centres. */
function tightest(vectors: readonly number[][], k: number, seed: number): { labels: number[]; centres: number[][] } {
  let best: { labels: number[]; centres: number[][]; fit: number } | null = null;
  for (let r = 0; r < RESTARTS; r++) {
    const run = kMeans(vectors, k, mulberry32(seed + 1000 * k + r));
    const fit = vectors.reduce((sum, v, i) => sum + dot(v, run.centres[run.labels[i]]), 0);
    if (!best || fit > best.fit) best = { ...run, fit };
  }
  return best!;
}

/** Spherical k-means with k-means++ seeding. */
export function kMeans(vectors: readonly number[][], k: number, random: () => number): { labels: number[]; centres: number[][] } {
  let centres = seedCentres(vectors, k, random);
  let labels = new Array<number>(vectors.length).fill(-1);
  for (let round = 0; round < 50; round++) {
    const next = vectors.map((v) => nearest(v, centres));
    const moved = next.some((label, i) => label !== labels[i]);
    labels = next;
    centres = centres.map((old, c) => {
      const members = vectors.filter((_, i) => labels[i] === c);
      return members.length ? normalise(mean(members)) : old;
    });
    if (!moved) break;
  }
  return { labels, centres };
}

/** Mean silhouette over all points, with cosine distance (1 − dot). −1…1; higher is better. */
export function silhouette(vectors: readonly number[][], labels: readonly number[], k: number): number {
  let total = 0;
  for (let i = 0; i < vectors.length; i++) {
    const sums = new Array<number>(k).fill(0);
    const counts = new Array<number>(k).fill(0);
    for (let j = 0; j < vectors.length; j++) {
      if (i === j) continue;
      sums[labels[j]] += 1 - dot(vectors[i], vectors[j]);
      counts[labels[j]]++;
    }
    const own = labels[i];
    if (counts[own] === 0) continue; // a cluster of one scores 0
    const a = sums[own] / counts[own];
    let b = Infinity;
    for (let c = 0; c < k; c++) if (c !== own && counts[c] > 0) b = Math.min(b, sums[c] / counts[c]);
    if (b === Infinity) continue;
    total += (b - a) / Math.max(a, b);
  }
  return total / vectors.length;
}

function seedCentres(vectors: readonly number[][], k: number, random: () => number): number[][] {
  const centres = [vectors[Math.floor(random() * vectors.length)]];
  while (centres.length < k) {
    // farther points are likelier picks (distance² weighting)
    const weights = vectors.map((v) => {
      const d = 1 - Math.max(...centres.map((c) => dot(v, c)));
      return Math.max(0, d) ** 2;
    });
    const sum = weights.reduce((s, w) => s + w, 0);
    if (sum === 0) break; // every point sits on a centre already
    let target = random() * sum;
    let index = 0;
    while (target > weights[index] && index < weights.length - 1) target -= weights[index++];
    centres.push(vectors[index]);
  }
  return centres;
}

function nearest(v: readonly number[], centres: readonly number[][]): number {
  let best = 0;
  let bestScore = -Infinity;
  centres.forEach((c, i) => {
    const s = dot(v, c);
    if (s > bestScore) [best, bestScore] = [i, s];
  });
  return best;
}

function mean(vectors: readonly number[][]): number[] {
  const out = new Array<number>(vectors[0].length).fill(0);
  for (const v of vectors) for (let i = 0; i < v.length; i++) out[i] += v[i];
  return out.map((x) => x / vectors.length);
}

function pick(n: number, count: number, random: () => number): number[] {
  const all = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (n - i));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count).sort((a, b) => a - b);
}

/** A small, fast, seedable random number generator — same seed, same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
