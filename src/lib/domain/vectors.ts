/** Vector arithmetic for embeddings. Vectors from the AI adapter are unit length. */

/** Scales a vector to length 1, so a dot product is the cosine similarity. */
export function normalise(v: readonly number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const length = Math.sqrt(sum);
  return length === 0 ? [...v] : v.map((x) => x / length);
}

/** Dot product — the cosine similarity of two unit vectors. */
export function dot(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
