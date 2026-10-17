import { open, readFile } from "node:fs/promises";
import exifr from "exifr";
import mammoth from "mammoth";
import { getDocumentProxy } from "unpdf";
import type { NewFileSignals } from "@/schemas/file-signals-schema";
import { formatDuration, listArchive, probeVideo, programInfo } from "./external-readers";

/** Longest excerpt kept — enough for a model to tell an invoice from a letter, short enough to stay cheap. */
export const EXCERPT_CHARS = 1500;
/** Larger PDFs and Word files are judged on their name and metadata alone; reading them costs too much. */
const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;
/** Plain-text files: only the opening is read. */
const TEXT_HEAD_BYTES = 16 * 1024;

const TEXT = new Set(["txt", "md", "csv", "tsv", "json", "log", "xml", "html", "htm", "rtf", "ini", "yaml", "yml"]);
const IMAGES = new Set(["jpg", "jpeg", "heic", "heif", "tif", "tiff", "png", "webp", "avif"]);
const VIDEOS = new Set(["mp4", "mkv", "mov", "avi", "webm", "flv", "m4v", "wmv", "ts"]);
const ARCHIVES = new Set(["zip", "7z", "rar", "tar", "gz", "tgz"]);
const PROGRAMS = new Set(["exe"]);

const NOTHING: NewFileSignals = {
  kind: "none",
  excerpt: null,
  pageCount: null,
  takenAt: null,
  camera: null,
  hasLocation: null,
  error: null,
};

/** True when there is anything to read from a file of this type. */
export function hasReadableSignals(extension: string): boolean {
  return (
    extension === "pdf" ||
    extension === "docx" ||
    TEXT.has(extension) ||
    IMAGES.has(extension) ||
    VIDEOS.has(extension) ||
    ARCHIVES.has(extension) ||
    PROGRAMS.has(extension)
  );
}

/**
 * Reads what code can tell about one file: the opening text of a PDF, Word or text file, or a
 * photo's capture time and camera. A damaged or password-protected file gives its error rather
 * than throwing — the file is still organised, on its name and dates. A file open in another
 * program does throw, so the caller can retry it later instead of recording a failure.
 */
export async function readSignals(path: string, extension: string, size: number): Promise<NewFileSignals> {
  try {
    if (extension === "pdf") return size > MAX_DOCUMENT_BYTES ? NOTHING : await readPdf(path);
    if (extension === "docx") return size > MAX_DOCUMENT_BYTES ? NOTHING : await readDocx(path);
    if (TEXT.has(extension)) return await readText(path);
    if (IMAGES.has(extension)) return await readPhoto(path);
    if (VIDEOS.has(extension)) return await readVideo(path);
    if (ARCHIVES.has(extension)) return await readArchive(path);
    if (PROGRAMS.has(extension)) return await readProgram(path);
    return NOTHING;
  } catch (error) {
    if (isLockError(error)) throw error;
    return { ...NOTHING, error: describe(error) };
  }
}

/** Collapses whitespace and caps the length, so the excerpt is compact model input. */
export function toExcerpt(text: string): string | null {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat ? flat.slice(0, EXCERPT_CHARS) : null;
}

async function readPdf(path: string): Promise<NewFileSignals> {
  const pdf = await getDocumentProxy(new Uint8Array(await readFile(path)), { verbosity: 0 });
  try {
    // the first page is usually enough; a cover page with no text gets the second as well
    let text = "";
    for (let n = 1; n <= Math.min(pdf.numPages, 2) && text.length < 200; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      text += " " + content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    }
    return { ...NOTHING, kind: "pdf", excerpt: toExcerpt(text), pageCount: pdf.numPages };
  } finally {
    await pdf.loadingTask.destroy(); // frees the parsed document and its worker-side copy
  }
}

async function readDocx(path: string): Promise<NewFileSignals> {
  const { value } = await mammoth.extractRawText({ path });
  return { ...NOTHING, kind: "docx", excerpt: toExcerpt(value) };
}

async function readText(path: string): Promise<NewFileSignals> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(TEXT_HEAD_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, TEXT_HEAD_BYTES, 0);
    return { ...NOTHING, kind: "text", excerpt: toExcerpt(buffer.subarray(0, bytesRead).toString("utf8")) };
  } finally {
    await handle.close();
  }
}

async function readPhoto(path: string): Promise<NewFileSignals> {
  const tags = (await exifr.parse(path, {
    pick: ["DateTimeOriginal", "CreateDate", "Make", "Model", "GPSLatitude"],
  })) as { DateTimeOriginal?: Date; CreateDate?: Date; Make?: string; Model?: string; GPSLatitude?: unknown } | undefined;
  const taken = tags?.DateTimeOriginal ?? tags?.CreateDate;
  return {
    ...NOTHING,
    kind: "image",
    takenAt: taken instanceof Date && !Number.isNaN(taken.getTime()) ? taken.toISOString() : null,
    camera: cameraName(tags?.Make, tags?.Model),
    hasLocation: tags ? tags.GPSLatitude !== undefined : null,
  };
}

/** A video's length and shape — a 3-hour landscape file is a stream recording, a 40-second upright one a short. */
async function readVideo(path: string): Promise<NewFileSignals> {
  const v = await probeVideo(path);
  if (!v) return { ...NOTHING, kind: "video", error: "Couldn't read the video's header" };
  const shape = v.height > v.width ? "portrait" : v.width === v.height ? "square" : "landscape";
  const parts = [`Video, ${formatDuration(v.seconds)}`, `${v.width}×${v.height} ${shape}`, v.codec];
  if (v.title) parts.push(`titled "${v.title}"`);
  return { ...NOTHING, kind: "video", excerpt: toExcerpt(parts.join(", ")) };
}

/** What an archive holds, listed by Windows' own tar without unpacking it. */
async function readArchive(path: string): Promise<NewFileSignals> {
  const a = await listArchive(path);
  if (!a) return { ...NOTHING, kind: "archive", error: "Couldn't list the archive" };
  return { ...NOTHING, kind: "archive", excerpt: toExcerpt(`Archive of ${a.count} files: ${a.names.join(", ")}`) };
}

/** What a program says about itself — product, maker, version. */
async function readProgram(path: string): Promise<NewFileSignals> {
  const p = await programInfo(path);
  if (!p) return { ...NOTHING, kind: "program" };
  const parts = [`Program: ${p.product ?? p.description}`];
  if (p.description && p.description !== p.product) parts.push(p.description);
  if (p.company) parts.push(`by ${p.company}`);
  if (p.version) parts.push(`version ${p.version}`);
  return { ...NOTHING, kind: "program", excerpt: toExcerpt(parts.join(", ")) };
}

/** "Google" + "Pixel 8" → "Google Pixel 8"; "Canon" + "Canon EOS R6" → "Canon EOS R6". */
function cameraName(make?: string, model?: string): string | null {
  const m = make?.trim();
  const d = model?.trim();
  if (!m && !d) return null;
  if (m && d && d.toLowerCase().startsWith(m.toLowerCase())) return d;
  return [m, d].filter(Boolean).join(" ");
}

/** The file is open elsewhere (or access is denied) — worth retrying, not worth recording. */
export function isLockError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "EBUSY" || code === "EPERM" || code === "EACCES";
}

function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/password/i.test(message)) return "Password-protected";
  return message.slice(0, 200);
}
