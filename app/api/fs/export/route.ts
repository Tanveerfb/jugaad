import { type NextRequest } from "next/server";
import { readFile, readdir } from "fs/promises";
import { join, normalize, relative } from "path";

const IGNORED = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
]);

function isUnderRoot(filePath: string, root: string): boolean {
  const normFile = normalize(filePath);
  const normRoot = normalize(root);
  return (
    normFile.startsWith(normRoot + normalize("/")) || normFile === normRoot
  );
}

async function collectFiles(
  absPath: string,
  root: string,
): Promise<{ path: string; content: string }[]> {
  let entries;
  try {
    entries = await readdir(absPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: { path: string; content: string }[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || IGNORED.has(entry.name)) continue;
    const fullPath = join(absPath, entry.name);
    const relPath = relative(root, fullPath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      const nested = await collectFiles(fullPath, root);
      results.push(...nested);
    } else {
      try {
        const content = await readFile(fullPath, "utf8");
        results.push({ path: relPath, content });
      } catch {
        // skip binary/unreadable files
      }
    }
  }
  return results;
}

export async function GET(req: NextRequest): Promise<Response> {
  const projectPath = req.nextUrl.searchParams.get("projectPath");
  if (!projectPath) {
    return Response.json({ error: "Missing projectPath" }, { status: 400 });
  }

  const root = normalize(projectPath);

  if (!isUnderRoot(root, root)) {
    return Response.json({ error: "Invalid path" }, { status: 403 });
  }

  const files = await collectFiles(root, root);
  return Response.json({ files });
}
