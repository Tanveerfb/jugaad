import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const execAsync = promisify(exec);

/**
 * Scaffolds a new Next.js project using create-next-app.
 * Skips silently if the project directory already has a package.json.
 *
 * Body: { projectPath: string }  — the full absolute path for the project folder.
 * CNA is invoked in the parent directory with the folder name as the project name.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { projectPath?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { projectPath } = body;
  if (typeof projectPath !== "string" || !projectPath.trim()) {
    return NextResponse.json(
      { error: "projectPath must be a non-empty string" },
      { status: 400 },
    );
  }

  // Skip if already scaffolded (e.g. re-running a build)
  if (existsSync(path.join(projectPath, "package.json"))) {
    return NextResponse.json({ skipped: true });
  }

  const parentDir = path.dirname(projectPath);
  const projectName = path.basename(projectPath);

  // All options are explicit so create-next-app never prompts interactively.
  const cmd = `npx --yes create-next-app@latest "${projectName}" --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint --no-turbopack --no-git`;

  try {
    await execAsync(cmd, { cwd: parentDir, timeout: 300_000 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
