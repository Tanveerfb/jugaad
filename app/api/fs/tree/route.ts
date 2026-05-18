import { type NextRequest } from "next/server";
import { readdir } from "fs/promises";
import { join, normalize, relative } from "path";
import type { FileTreeNode } from "@/types";

const IGNORED = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
]);

async function buildTree(
  absPath: string,
  rootBase: string,
): Promise<FileTreeNode[]> {
  let entries;
  try {
    entries = await readdir(absPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: FileTreeNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || IGNORED.has(entry.name)) continue;

    const fullPath = join(absPath, entry.name);
    const relPath = relative(rootBase, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      const children = await buildTree(fullPath, rootBase);
      nodes.push({
        name: entry.name,
        path: relPath,
        type: "directory",
        children,
      });
    } else {
      nodes.push({ name: entry.name, path: relPath, type: "file" });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function GET(req: NextRequest): Promise<Response> {
  const projectPath = req.nextUrl.searchParams.get("projectPath");
  if (!projectPath) {
    return Response.json({ error: "Missing projectPath" }, { status: 400 });
  }

  const root = normalize(projectPath);
  const tree = await buildTree(root, root);
  return Response.json({ tree });
}
