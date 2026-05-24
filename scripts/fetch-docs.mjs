/**
 * scripts/fetch-docs.mjs
 *
 * Downloads documentation for every stack in the registry and saves it to
 * public/docs/{id}.txt so docFetcher.ts can serve it locally at runtime.
 *
 * Run with:   npm run fetch-docs
 *
 * Prioritises llms.txt endpoints (clean, LLM-ready plain text published by
 * modern docs sites) and falls back to HTML scraping of the registered docUrl.
 *
 * Files are saved under public/docs/ and served by Next.js as static assets.
 * The docFetcher reads from /docs/{id}.txt before hitting the network.
 */

import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "docs");

const TIMEOUT_MS = 15_000;
/** Char budget per doc — generous but keeps prompts sane. */
const MAX_CHARS = 15_000;

// ─── Stack definitions ────────────────────────────────────────────────────────
// llmsTxt   — preferred: clean plaintext published for LLM consumption
// fallback  — HTML page to scrape if llmsTxt is unavailable / too short
const STACKS = [
  // Language Group A
  {
    id: "nextjs",
    llmsTxt: "https://nextjs.org/llms.txt",
    fallback: "https://nextjs.org/docs/app/api-reference/file-conventions",
  },
  {
    id: "typescript",
    llmsTxt: null,
    fallback:
      "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
  },
  // Language Group B
  {
    id: "reactjs",
    llmsTxt: "https://react.dev/llms.txt",
    fallback: "https://react.dev/reference/react",
  },
  {
    id: "javascript",
    llmsTxt: null,
    fallback:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction",
  },
  // Styling
  {
    id: "tailwind",
    llmsTxt: "https://tailwindcss.com/llms.txt",
    fallback: "https://tailwindcss.com/docs/installation",
  },
  {
    id: "bootstrap",
    llmsTxt: null,
    fallback: "https://getbootstrap.com/docs/5.3/getting-started/introduction/",
  },
  // UI Components
  {
    id: "shadcn",
    llmsTxt: "https://ui.shadcn.com/llms.txt",
    fallback: "https://ui.shadcn.com/docs/components/button",
  },
  {
    id: "mui",
    llmsTxt: null,
    fallback: "https://mui.com/material-ui/getting-started/",
  },
  {
    id: "react-bootstrap",
    llmsTxt: null,
    fallback:
      "https://react-bootstrap.netlify.app/docs/getting-started/introduction",
  },
  // Database
  {
    id: "firestore",
    llmsTxt: null,
    fallback: "https://firebase.google.com/docs/firestore/quickstart",
  },
  // Auth
  {
    id: "nextauth",
    llmsTxt: "https://authjs.dev/llms.txt",
    fallback: "https://authjs.dev/getting-started",
  },
  {
    id: "firebase-auth",
    llmsTxt: null,
    fallback: "https://firebase.google.com/docs/auth/web/start",
  },
  // Utilities
  {
    id: "rhf",
    llmsTxt: null,
    fallback: "https://react-hook-form.com/docs/useform",
  },
  {
    id: "zustand",
    llmsTxt: "https://zustand.docs.pmnd.rs/llms.txt",
    fallback: "https://docs.pmnd.rs/zustand/getting-started/introduction",
  },
  {
    id: "framer",
    llmsTxt: "https://motion.dev/llms.txt",
    fallback: "https://motion.dev/docs/react-quick-start",
  },
  {
    id: "gemini",
    llmsTxt: null,
    fallback: "https://ai.google.dev/gemini-api/docs/quickstart?lang=node",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchRaw(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "jugaad-doc-fetcher/1.0" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isPlaintext(text) {
  // Reject if it looks like HTML (starts with <!DOCTYPE or <html)
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) return false;
  // Also reject if the ratio of < tags is very high (JS/HTML heavy pages)
  const tagMatches = (text.match(/</g) || []).length;
  if (tagMatches > text.length / 30) return false;
  return true;
}

function stripHtml(raw) {
  let text = raw.replace(
    /<(script|style|nav|header|footer|aside|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi,
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

async function fetchDoc(stack) {
  // 1. Try llms.txt (clean plaintext)
  if (stack.llmsTxt) {
    const raw = await fetchRaw(stack.llmsTxt);
    if (raw && raw.length >= 300 && isPlaintext(raw)) {
      console.log(`  ✓ llms.txt  ${stack.id}`);
      return raw.slice(0, MAX_CHARS);
    }
  }

  // 2. Fall back to HTML scraping of docUrl
  const raw = await fetchRaw(stack.fallback);
  if (!raw) {
    console.log(`  ✗ failed    ${stack.id} (no response)`);
    return `No documentation available for ${stack.id}. Refer to the official docs.`;
  }

  const text = isPlaintext(raw) ? raw : stripHtml(raw);
  if (text.length < 100) {
    console.log(`  ✗ empty     ${stack.id}`);
    return `No documentation available for ${stack.id}.`;
  }

  console.log(`  ~ fallback  ${stack.id} (${text.length} chars before trim)`);
  return text.slice(0, MAX_CHARS);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`\nFetching docs for ${STACKS.length} stacks → ${OUT_DIR}\n`);

  const results = { ok: 0, failed: 0 };

  for (const stack of STACKS) {
    try {
      const content = await fetchDoc(stack);
      const outPath = join(OUT_DIR, `${stack.id}.txt`);
      await writeFile(outPath, content, "utf8");
      results.ok++;
    } catch (err) {
      console.error(`  ERROR ${stack.id}: ${err.message}`);
      results.failed++;
    }
  }

  console.log(
    `\nDone. ${results.ok} succeeded, ${results.failed} failed.\n` +
      `Files written to public/docs/\n` +
      `Re-run "npm run fetch-docs" whenever you want to refresh.\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
