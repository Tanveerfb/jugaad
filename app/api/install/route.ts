import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { NextResponse } from "next/server";

const execAsync = promisify(exec);

export async function POST(req: Request): Promise<NextResponse> {
  let projectPath: unknown;

  try {
    const body = (await req.json()) as { projectPath?: unknown };
    projectPath = body.projectPath;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof projectPath !== "string" || projectPath.trim() === "") {
    return NextResponse.json(
      { error: "projectPath must be a non-empty string" },
      { status: 400 },
    );
  }

  // Ensure the directory actually exists before running anything
  if (!existsSync(projectPath)) {
    return NextResponse.json(
      { error: `Directory not found: ${projectPath}` },
      { status: 400 },
    );
  }

  try {
    const { stdout, stderr } = await execAsync("npm install", {
      cwd: projectPath,
      timeout: 180_000, // 3 minutes
    });
    return NextResponse.json({
      success: true,
      output: stdout,
      warnings: stderr,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
