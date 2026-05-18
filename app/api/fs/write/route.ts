import { type NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, normalize, dirname } from "path";

function isUnderRoot(filePath: string, root: string): boolean {
  // Prevent path traversal — target must start with the project root
  const normFile = normalize(filePath);
  const normRoot = normalize(root);
  return (
    normFile.startsWith(normRoot + normalize("/")) || normFile === normRoot
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: { projectPath?: string; filePath?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { projectPath, filePath, content } = body;

  if (!projectPath || !filePath || content === undefined) {
    return Response.json(
      { error: "Missing projectPath, filePath or content" },
      { status: 400 },
    );
  }

  // Normalise the relative filePath (forward or backslashes → OS separator)
  const relativeNorm = filePath.replace(/[/\\]/g, "/");
  const targetPath = join(normalize(projectPath), ...relativeNorm.split("/"));

  if (!isUnderRoot(targetPath, projectPath)) {
    return Response.json(
      { error: "Path traversal not allowed" },
      { status: 403 },
    );
  }

  try {
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");
    return Response.json({ ok: true, path: targetPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Write failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
