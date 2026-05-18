/**
 * Renames a Jugaad project.
 * - Renames the folder on disk to the new slug.
 * - Updates the name field in jugaad.json.
 * Returns the new path and slug so the client can update its state.
 */
import { renameSync, existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import type { ProjectPlan } from "@/types";

function toSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 60) || "project"
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  let projectPath: unknown;
  let newName: unknown;

  try {
    const body = (await req.json()) as {
      projectPath?: unknown;
      newName?: unknown;
    };
    projectPath = body.projectPath;
    newName = body.newName;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof projectPath !== "string" || !projectPath.trim()) {
    return NextResponse.json(
      { error: "projectPath must be a non-empty string" },
      { status: 400 },
    );
  }

  if (typeof newName !== "string" || !newName.trim()) {
    return NextResponse.json(
      { error: "newName must be a non-empty string" },
      { status: 400 },
    );
  }

  if (!existsSync(projectPath)) {
    return NextResponse.json(
      { error: `Project not found: ${projectPath}` },
      { status: 404 },
    );
  }

  const parentDir = path.dirname(projectPath);
  const newSlug = toSlug(newName.trim());
  const newPath = path.join(parentDir, newSlug);

  // Rename folder only if the slug actually changes
  if (newPath !== projectPath) {
    if (existsSync(newPath)) {
      return NextResponse.json(
        {
          error: `A project folder named "${newSlug}" already exists in the output folder`,
        },
        { status: 409 },
      );
    }
    renameSync(projectPath, newPath);
  }

  // Update the name (and updatedAt) in jugaad.json
  const manifestPath = path.join(newPath, "jugaad.json");
  if (existsSync(manifestPath)) {
    try {
      const plan = JSON.parse(
        readFileSync(manifestPath, "utf-8"),
      ) as ProjectPlan;
      plan.name = newName.trim();
      plan.updatedAt = Date.now();
      writeFileSync(manifestPath, JSON.stringify(plan, null, 2), "utf-8");
    } catch {
      // non-fatal — folder is renamed, manifest update failed
    }
  }

  return NextResponse.json({ success: true, newPath, newSlug });
}
