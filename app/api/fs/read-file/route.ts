import { type NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join, normalize } from "path";

function isUnderRoot(filePath: string, root: string): boolean {
  const normFile = normalize(filePath);
  const normRoot = normalize(root);
  return (
    normFile.startsWith(normRoot + normalize("/")) || normFile === normRoot
  );
}

export async function GET(req: NextRequest): Promise<Response> {
  const projectPath = req.nextUrl.searchParams.get("projectPath");
  const filePath = req.nextUrl.searchParams.get("filePath");

  if (!projectPath || !filePath) {
    return Response.json(
      { error: "Missing projectPath or filePath" },
      { status: 400 },
    );
  }

  const target = join(normalize(projectPath), ...filePath.split("/"));

  if (!isUnderRoot(target, projectPath)) {
    return Response.json(
      { error: "Path traversal not allowed" },
      { status: 403 },
    );
  }

  try {
    const content = await readFile(target, "utf8");
    return Response.json({ content });
  } catch {
    return Response.json({ error: "Cannot read file" }, { status: 404 });
  }
}
