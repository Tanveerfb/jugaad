import type { NewPlanMove } from "@/schemas/plan-schema";

/**
 * Where each file goes in a plan — pure rules, no disk and no model (spec, Organiser step 5).
 * Destinations sit inside the allowed folder: `<Category>\<name>` for a confident answer,
 * `_review\<name>` for a doubtful one, `_review\Duplicates\<name>` for extra copies. Names are
 * kept unless the owner ticks a suggested one; a clash gets " (2)", " (3)"… rather than ever
 * replacing anything.
 */

/** Jugaad's own folder inside an allowed folder, for everything the owner should look at. */
export const REVIEW_FOLDER = "_review";
export const DUPLICATES_FOLDER = `${REVIEW_FOLDER}\\Duplicates`;

export type PlannedFile =
  | { path: string; kind: "sorted"; category: string; confidence: number; suggestedName?: string; isFolder?: boolean }
  /** `category` is the model's best guess, or null when classifying failed. */
  | { path: string; kind: "needs-review"; category: string | null; confidence: number; suggestedName?: string; isFolder?: boolean }
  | { path: string; kind: "duplicate"; keeperPath: string };

/** True for a file sitting directly in the folder, not in a subfolder. */
export function isLoose(path: string): boolean {
  return !/[\\/]/.test(path);
}

/**
 * Whether a file is one the Organiser sorts: always the folder's own files; with subfolders
 * included, nested files too — except those already filed in a category folder or `_review`
 * (`settled`, lower-case), which are where they belong. Suggestions and plans use the same rule,
 * so categories are suggested from the files that will be sorted. Files that belong to the
 * folder itself, are still downloading (`isFolderOwned`) or are hidden (`isHidden`) are never sorted.
 */
export function inScope(path: string, includeSubfolders: boolean, settled: ReadonlySet<string>): boolean {
  if (isFolderOwned(path) || isHidden(path)) return false;
  if (isLoose(path)) return true;
  return includeSubfolders && !settled.has(topFolder(path)!.toLowerCase());
}

/** Files Windows (or macOS) keeps to describe the folder they sit in: its icon, name, thumbnails. */
const FOLDER_FILES = new Set(["desktop.ini", "thumbs.db", "ehthumbs.db", ".ds_store"]);
/** A browser's or a download manager's file still being written. */
const DOWNLOADING = /\.(crdownload|part|partial|download|opdownload)$/i;

/**
 * A file that must stay where it is: folder metadata (moving `desktop.ini` out of Downloads
 * loses its icon and name — the 2026-10-17 audit planned exactly that) or a download in progress.
 */
export function isFolderOwned(path: string): boolean {
  const name = path.slice(Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/")) + 1);
  return FOLDER_FILES.has(name.toLowerCase()) || DOWNLOADING.test(name);
}

/**
 * A hidden file, or a file inside a hidden folder (a name starting with "."). Apps keep their
 * own state in such folders; the owner's real run moved 8 files out of `.remember` before this
 * rule existed (2026-10-17).
 */
export function isHidden(path: string): boolean {
  return path.split(/[\\/]/).some((part) => part.startsWith("."));
}

/** The first folder of a relative path, or null for a loose file: `Invoices\2024\a.pdf` → `Invoices`. */
export function topFolder(path: string): string | null {
  const parts = path.split(/[\\/]/);
  return parts.length > 1 ? parts[0] : null;
}

/**
 * Turns decisions into moves with unique destinations. `taken` holds paths that already exist
 * in the folder (compared without letter case), so no move lands on an existing file or on
 * another move's destination. Files already where they would go are left out.
 */
export function toMoves(files: readonly PlannedFile[], taken: ReadonlySet<string>): NewPlanMove[] {
  const used = new Set([...taken].map((p) => p.toLowerCase()));
  const moves: NewPlanMove[] = [];
  for (const f of files) {
    const name = f.path.split(/[\\/]/).at(-1)!;
    const folder =
      f.kind === "sorted" ? f.category : f.kind === "needs-review" ? REVIEW_FOLDER : DUPLICATES_FOLDER;
    const target = uniquePath(`${folder}\\${name}`, used);
    if (target.toLowerCase() === f.path.toLowerCase()) continue;
    used.add(target.toLowerCase());
    moves.push({
      fromPath: f.path,
      toPath: target,
      category: f.kind === "duplicate" ? null : f.category,
      confidence: f.kind === "duplicate" ? null : f.confidence,
      // only sorted files get rename suggestions: a project keeps its name, and a model unsure
      // where a file goes is no surer what it is
      suggestedName: f.kind !== "sorted" || f.isFolder || !looksMessy(name) ? null : toFileName(f.suggestedName ?? "", name),
      isFolder: f.kind !== "duplicate" && f.isFolder === true,
    });
  }
  return moves;
}

/** Device names Windows reserves — no file may be called one, whatever its extension. */
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

/** Characters Windows forbids in a file name, and control characters. */
const FORBIDDEN = /[<>:"|?*\u0000-\u001f]/g;

/**
 * Clutter that makes a name worth tidying: copy markers, "final", generic names, scanner and
 * browser leftovers, URL encoding, or sheer length. Camera and phone names (IMG-20250827-WA0130)
 * are not clutter — the model can't see a photo, so it has nothing better to offer. On the
 * owner's Downloads the model suggested a name for 380 of 525 files (audit, 2026-10-17); this
 * keeps suggestions for the names that are actually messy.
 */
const CLUTTER = [
  /\(\d+\)/, // "report (2).pdf"
  /(^|[\s_-])(copy|final|new|old|draft|untitled|download(ed)?|document|file)([\s_.-]|\d|$)/i,
  /^(image|scan|doc|img|photo|video|audio|output)[\s_-]?\(?\d+\)?$/i, // "image (23)", "scan0007"
  /%[0-9a-f]{2}/i, // "my%20file"
  /[_-]{2,}|\s{2,}/, // doubled separators
];

/** True when a file name has clutter a better name would remove. */
export function looksMessy(fileName: string): boolean {
  const stem = fileName.replace(/\.[^.]+$/, "");
  return stem.length > 60 || CLUTTER.some((pattern) => pattern.test(stem));
}

/** Two names that differ only in letter case or separators are the same name to the owner. */
function sameWords(a: string, b: string): boolean {
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return key(a) === key(b);
}

/**
 * A model's suggested name made safe to offer: forbidden characters removed, the original
 * extension kept whatever the model wrote, and null when the result is unusable or no different
 * from the current name. The owner ticks it per move; it is never applied unasked.
 */
export function toFileName(suggested: string, original: string): string | null {
  const dot = original.lastIndexOf(".");
  const ext = dot > 0 ? original.slice(dot) : "";
  const last = suggested.split(/[\\/]/).at(-1) ?? "";
  const stem = (ext && last.toLowerCase().endsWith(ext.toLowerCase()) ? last.slice(0, -ext.length) : last)
    .replace(FORBIDDEN, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 120);
  if (!stem || RESERVED.test(stem)) return null;
  const name = stem + ext;
  return sameWords(name, original) ? null : name;
}

/** The same destination folder with a different file name: `Invoices\a.pdf` + `b.pdf` → `Invoices\b.pdf`. */
export function withName(path: string, name: string): string {
  const slash = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return slash < 0 ? name : `${path.slice(0, slash + 1)}${name}`;
}

/** `Invoices\a.pdf` → `Invoices\a (2).pdf` → `Invoices\a (3).pdf`, until it's free. */
export function uniquePath(path: string, used: ReadonlySet<string>): string {
  if (!used.has(path.toLowerCase())) return path;
  const dot = path.lastIndexOf(".");
  const slash = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  const [stem, ext] = dot > slash + 1 ? [path.slice(0, dot), path.slice(dot)] : [path, ""];
  for (let n = 2; ; n++) {
    const candidate = `${stem} (${n})${ext}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}
