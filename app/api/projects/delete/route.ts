/**
 * Deletes a Jugaad project.
 * If deleteDisk is true, the project folder is removed from disk.
 * If false, only Jugaad's record is removed (the folder remains on disk).
 */
import { rmSync, existsSync } from "fs";
import { NextResponse } from "next/server";

export async function POST(req: Request): Promise<NextResponse> {
  let projectPath: unknown;
  let deleteDisk: unknown;

  try {
    const body = (await req.json()) as {
      projectPath?: unknown;
      deleteDisk?: unknown;
    };
    projectPath = body.projectPath;
    deleteDisk = body.deleteDisk;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof projectPath !== "string" || !projectPath.trim()) {
    return NextResponse.json(
      { error: "projectPath must be a non-empty string" },
      { status: 400 },
    );
  }

  if (deleteDisk === true) {
    if (!existsSync(projectPath)) {
      return NextResponse.json(
        { error: `Directory not found: ${projectPath}` },
        { status: 404 },
      );
    }
    rmSync(projectPath, { recursive: true, force: true });
  }

  return NextResponse.json({ success: true });
}
