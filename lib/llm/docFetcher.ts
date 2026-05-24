const docCache = new Map<string, string>();

const TIMEOUT_MS = 10_000;
/** Full fetch used in the plan-chat context where more detail helps. */
const MAX_CHARS = 8_000;
/** Trimmed slice used in task-generation prompts to keep the context window sane. */
export const TASK_GEN_MAX_CHARS = 2_500;
const CONTEXT_LINES = 50;

/**
 * Stack IDs that have a locally-cached doc file under public/docs/{id}.txt.
 * Updated automatically when you run `npm run fetch-docs`.
 * The set is checked at runtime; unknown IDs fall through to network fetch.
 */
const LOCAL_DOC_IDS = new Set([
  "nextjs",
  "typescript",
  "reactjs",
  "javascript",
  "tailwind",
  "bootstrap",
  "shadcn",
  "mui",
  "react-bootstrap",
  "firestore",
  "nextauth",
  "firebase-auth",
  "rhf",
  "zustand",
  "framer",
  "gemini",
]);

async function fetchLocalDoc(stackId: string): Promise<string | null> {
  try {
    const res = await fetch(`/docs/${stackId}.txt`, { cache: "force-cache" });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length >= 100 ? text : null;
  } catch {
    return null;
  }
}

function stripHtml(raw: string): string {
  let text = raw.replace(
    /<(script|style|nav|header|footer|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function extractAroundKeyword(text: string, keyword: string): string {
  const lines = text.split(". ");
  const idx = lines.findIndex((l) =>
    l.toLowerCase().includes(keyword.toLowerCase()),
  );
  if (idx === -1) return text;
  const start = Math.max(0, idx - CONTEXT_LINES);
  const end = Math.min(lines.length, idx + CONTEXT_LINES);
  return lines.slice(start, end).join(". ");
}

/**
 * Fetch a documentation chunk for a given URL (and optional stack ID).
 * Resolution order:
 *   1. In-memory cache
 *   2. Local static file at /docs/{stackId}.txt  (served from public/)
 *   3. Live network fetch of `url` with HTML stripping
 */
export async function fetchDocChunk(
  url: string,
  stackId?: string,
  keyword?: string,
): Promise<string> {
  const cacheKey = `${stackId ?? url}::${keyword ?? ""}`;
  if (docCache.has(cacheKey)) return docCache.get(cacheKey)!;

  // ── 1. Try local bundled doc ──────────────────────────────────────────────
  if (stackId && LOCAL_DOC_IDS.has(stackId)) {
    const local = await fetchLocalDoc(stackId);
    if (local) {
      let text = local.slice(0, MAX_CHARS);
      if (keyword) text = extractAroundKeyword(text, keyword);
      docCache.set(cacheKey, text);
      return text;
    }
  }

  // ── 2. Network fallback ───────────────────────────────────────────────────
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let raw: string;
  try {
    const res = await fetch(url, { signal: controller.signal });
    raw = await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }

  let text = stripHtml(raw);
  if (keyword) text = extractAroundKeyword(text, keyword);
  const truncated = text.slice(0, MAX_CHARS);

  docCache.set(cacheKey, truncated);
  return truncated;
}

/**
 * Fetch docs for a set of stack IDs (from stackOptions).
 * Returns a map of stackId → doc chunk string.
 * Fetches concurrently; silently returns "" for any that fail.
 */
export async function fetchStackDocs(
  stackIds: string[],
): Promise<Record<string, string>> {
  const { stackOptions } = await import("@/components/stack/stackRegistry");
  const selected = stackOptions.filter((o) => stackIds.includes(o.id));
  const entries = await Promise.all(
    selected.map(async (opt) => {
      const chunk = await fetchDocChunk(opt.docUrl, opt.id);
      return [opt.id, chunk] as const;
    }),
  );
  return Object.fromEntries(entries);
}
