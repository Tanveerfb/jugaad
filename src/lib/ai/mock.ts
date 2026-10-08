import type { ClassifyFileInput, FileClassification } from "@/schemas/file-classification-schema";
import type { WorkbenchAi } from "./types";

/**
 * Deterministic stand-in for a model — development without a GPU (the laptop) and every
 * unit test (project-rules §AI, §TESTING). Same input, same answer, no I/O.
 *
 * Picks the first approved category whose name shares a word with the file name, excerpt or
 * extension; with no match it falls back to the first category at low confidence, which
 * exercises the "needs review" path.
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
  };
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

/** "IMG_0423 (2).JPG" → "img-0423-2.jpg" */
function tidyName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot).toLowerCase() : "";
  const tidy = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${tidy || "file"}${ext}`;
}
