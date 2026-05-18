/**
 * Lists all Jugaad projects in the given output folder.
 * A project is any subfolder that contains a jugaad.json manifest.
 */
import { readdirSync, existsSync } from "fs";
import { readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import type { ProjectPlan } from "@/types";

export type LocalProject = {
  slug: string;
  path: string;
  plan: ProjectPlan;
  /** Whether the project has been fully built (has package.json). */
  isBuilt: boolean;
};

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const outputFolder = searchParams.get("outputFolder");

  if (!outputFolder || typeof outputFolder !== "string") {
    return NextResponse.json(
      { error: "outputFolder query parameter is required" },
      { status: 400 },
    );
  }

  if (!existsSync(outputFolder)) {
    return NextResponse.json({ projects: [] });
  }

  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(outputFolder, { withFileTypes: true });
  } catch {
    return NextResponse.json({ projects: [] });
  }

  const projects: LocalProject[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const projectPath = path.join(outputFolder, entry.name);
    const manifestPath = path.join(projectPath, "jugaad.json");

    if (!existsSync(manifestPath)) continue;

    try {
      const plan = JSON.parse(
        readFileSync(manifestPath, "utf-8"),
      ) as ProjectPlan;
      const isBuilt = existsSync(path.join(projectPath, "package.json"));
      projects.push({ slug: entry.name, path: projectPath, plan, isBuilt });
    } catch {
      // Malformed jugaad.json — skip silently
    }
  }

  // Most recently updated first
  projects.sort((a, b) => b.plan.updatedAt - a.plan.updatedAt);

  return NextResponse.json({ projects });
}
