const docCache = new Map<string, string>();

const TIMEOUT_MS = 10_000;
const MAX_CHARS = 8_000;
const CONTEXT_LINES = 50;

function stripHtml(raw: string): string {
  // Remove script, style, nav, header, footer, aside blocks
  let text = raw.replace(
    /<(script|style|nav|header|footer|aside|noscript)[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Normalize whitespace
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

export async function fetchDocChunk(
  url: string,
  keyword?: string,
): Promise<string> {
  const cacheKey = `${url}::${keyword ?? ""}`;
  if (docCache.has(cacheKey)) return docCache.get(cacheKey)!;

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
      const chunk = await fetchDocChunk(opt.docUrl);
      return [opt.id, chunk] as const;
    }),
  );
  return Object.fromEntries(entries);
}
