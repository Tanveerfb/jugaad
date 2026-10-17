import type { FilingExample } from "@/schemas/file-classification-schema";

/** Examples shown to the model per file. A few close ones teach more than many loose ones. */
export const EXAMPLES_PER_FILE = 6;

/**
 * The owner's past filing decisions most like this file, by the words their descriptions share
 * (Jaccard overlap) — cheap, and needs no model. Examples sharing nothing are left out: an
 * unrelated example teaches the model nothing about this file.
 */
export function nearestExamples(
  description: string,
  examples: readonly FilingExample[],
  count: number = EXAMPLES_PER_FILE,
): FilingExample[] {
  const mine = words(description);
  if (mine.size === 0) return [];
  return examples
    .map((example) => ({ example, score: overlap(mine, words(example.description)) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.example);
}

/** Words every description has (describeFile's own wording) or that say nothing about a file. */
const FILLER = new Set(["file", "the", "and", "for", "with", "from", "this", "that", "photo", "image", "showing", "taken"]);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !/^[0-9]+$/.test(w) && !FILLER.has(w)),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}
