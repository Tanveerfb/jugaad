import type { ClassifyFileInput, FileClassification } from "@/schemas/file-classification-schema";
import { normalise } from "@/lib/domain/vectors";
import type { WorkbenchAi } from "./types";

/** Dimensions of the mock's embeddings. */
const MOCK_DIMENSIONS = 64;

/**
 * Deterministic stand-in for a model — development without a GPU (the laptop) and every
 * unit test (project-rules §AI, §TESTING). Same input, same answer, no I/O.
 *
 * Picks the first approved category whose name shares a word with the file name, excerpt or
 * extension; with no match it falls back to the first category at low confidence, which
 * exercises the "needs review" path.
 *
 * Embeddings are a hashed bag of words: texts sharing words (by stem) point the same way, so
 * clustering behaves sensibly in tests without a model.
 */
export function createMockAi(): WorkbenchAi {
  return {
    provider: "mock",
    async classifyFile(input: ClassifyFileInput): Promise<FileClassification> {
      const haystack = words(`${input.fileName} ${input.extension} ${input.excerpt ?? ""}`);
      const match = input.categories.find((c) => words(c).some((w) => haystack.some((h) => sameStem(w, h))));
      return {
        category: match ?? input.categories[0],
        suggestedName: tidyName(input.fileName),
        confidence: match ? 0.9 : 0.3,
      };
    },

    async nameCategories(input) {
      // per group, the most common word in its files' names that no earlier group took
      const taken = new Set<string>();
      const names = input.groups.map((group, i) => {
        const counts = new Map<string, number>();
        for (const f of group.files) {
          for (const w of new Set(words(f.name.replace(/[.][^.]+$/, "")))) counts.set(w, (counts.get(w) ?? 0) + 1);
        }
        const ranked = [...counts]
          .filter(([w]) => !/^[0-9]+$/.test(w) && !taken.has(w))
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const word = ranked[0]?.[0] ?? `group ${i + 1}`;
        taken.add(word);
        return word[0].toUpperCase() + word.slice(1);
      });
      return { names };
    },

    async describeImage(input) {
      // the name's words stand in for what a real model would see
      return { caption: `Image: ${words(input.fileName.replace(/[.][^.]+$/, "")).join(" ") || "picture"}` };
    },

    async embedTexts(texts) {
      return texts.map((text) => {
        const v = new Array<number>(MOCK_DIMENSIONS).fill(0);
        for (const w of words(text)) v[bucket(w.slice(0, 5))] += 1;
        return normalise(v);
      });
    },
  };
}

/** A word's slot in the mock vector — the first five letters, so "invoice" and "invoices" share one. */
function bucket(stem: string): number {
  let h = 0;
  for (const c of stem) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % MOCK_DIMENSIONS;
}

/** "invoice" ~ "invoices", "photo" ~ "photos": one word starts with the other (4+ letters). */
function sameStem(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return a === b;
  return a.startsWith(b) || b.startsWith(a);
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

/** "IMG_0423 FINAL (2).JPG" → "img-0423.jpg" */
function tidyName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot).toLowerCase() : "";
  const tidy = stem
    .toLowerCase()
    .replace(/[(][0-9]+[)]/g, " ") // copy markers go, as a real model drops them
    .replace(/(^|[^a-z])(copy|final|new|old|draft)(?=[^a-z]|$)/g, "$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${tidy || "file"}${ext}`;
}
