import { readdirSync, readFileSync, existsSync } from "fs";
import { join, extname } from "path";

const SKIP_DIRS = ["node_modules", ".next", ".git", "dist", "build", ".turbo"];
const SKIP_VARS = new Set([
  "NODE_ENV",
  "VERCEL",
  "VERCEL_URL",
  "PORT",
  "HOSTNAME",
  "NEXT_PUBLIC_VERCEL_URL",
  "VERCEL_ENV",
  "CI",
]);

function walk(dir: string, out: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if ([".ts", ".tsx", ".js", ".jsx"].includes(extname(e.name)))
      out.push(full);
  }
  return out;
}

export function scanEnvVars(projectPath: string): string[] {
  const files = walk(projectPath);
  const vars = new Set<string>();
  const re = /process\.env\.([A-Z][A-Z0-9_]*)/g;
  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const m of content.matchAll(re)) {
      if (!SKIP_VARS.has(m[1])) vars.add(m[1]);
    }
  }
  return Array.from(vars).sort();
}

export function readEnvLocal(projectPath: string): Record<string, string> {
  const envPath = join(projectPath, ".env.local");
  if (!existsSync(envPath)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    values[t.slice(0, eq).trim()] = t.slice(eq + 1).replace(/^["']|["']$/g, "");
  }
  return values;
}

export function getMissingVars(projectPath: string): {
  all: string[];
  missing: string[];
} {
  const all = scanEnvVars(projectPath);
  const existing = readEnvLocal(projectPath);
  const missing = all.filter((v) => !existing[v]);
  return { all, missing };
}
