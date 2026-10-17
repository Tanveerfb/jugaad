import type { FileSignals } from "@/schemas/file-signals-schema";
import type { IndexedFile } from "@/schemas/indexed-file-schema";

/** Longest description embedded per file — the name, where it sits, and the opening of its text. */
const MAX_DESCRIPTION = 600;

/**
 * One line of text that says what a file is, for embedding: its name with separators turned to
 * spaces (so `Invoice_0423_final` reads as words), the folder it sits in, its type, and what
 * was read from it — opening text, what an image shows, a photo's date and camera.
 */
export function describeFile(file: IndexedFile, signals?: FileSignals): string {
  const name = file.path.split(/[\\/]/).at(-1) ?? file.path;
  const stem = name.replace(/\.[^.]+$/, "");
  const parent = file.path.split(/[\\/]/).slice(0, -1).join(" / ");
  const parts = [words(stem), file.extension ? `${file.extension} file` : "file"];
  if (parent) parts.push(`in ${words(parent)}`);
  if (signals?.excerpt) parts.push(signals.excerpt);
  if (signals?.caption) parts.push(signals.caption);
  if (signals?.kind === "image") {
    const photo = ["photo", signals.takenAt ? `taken ${signals.takenAt.slice(0, 10)}` : "", signals.camera ? `on ${signals.camera}` : ""];
    parts.push(photo.filter(Boolean).join(" "));
  }
  return parts.join(" — ").slice(0, MAX_DESCRIPTION);
}

/** "IMG_2001-final(2)" → "IMG 2001 final 2"; camelCase is split too. */
function words(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.()[\]{}+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
