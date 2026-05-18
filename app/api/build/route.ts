/**
 * Runs `next build --no-lint` in the generated project directory.
 *
 * Used by the post-build repair loop after ALL task files have been written
 * and `npm install` has completed. Returns structured build errors so the
 * executor can target specific files for re-generation.
 */
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { NextResponse } from "next/server";

const execAsync = promisify(exec);

export type BuildError = {
  /** Relative file path from the project root, e.g. "app/page.tsx" */
  file: string;
  message: string;
};

export type BuildResult = {
  success: boolean;
  errors: BuildError[];
  raw: string;
};

/**
 * Parse `next build` output into structured per-file errors.
 *
 * Next.js emits lines like:
 *   ./app/page.tsx
 *   Module not found: Can't resolve '@/components/Board'
 *
 * Or TypeScript errors:
 *   Type error: Property 'x' does not exist on type 'Y'.
 *   ./components/Board.tsx:42:5
 */
function parseBuildErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];
  const lines = output.split("\n");
  let pendingFile: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect file path lines: ./app/page.tsx  or  ./app/page.tsx:42:5
    const fileMatch = line.match(
      /^\.[\\/]([\w\-./\\]+\.(?:tsx?|jsx?|mjs|cjs))(?::\d+:\d+)?$/,
    );
    if (fileMatch) {
      pendingFile = fileMatch[1].replace(/\\/g, "/");
      continue;
    }

    // Detect TypeScript error lines that embed the path: app/page.tsx:42:5
    const tsErrMatch = line.match(/^([\w\-./\\]+\.(?:tsx?|jsx?)):(\d+):(\d+)$/);
    if (tsErrMatch) {
      pendingFile = tsErrMatch[1].replace(/\\/g, "/");
      continue;
    }

    // Error / warning lines following a file path
    if (
      pendingFile &&
      (line.startsWith("Error:") ||
        line.startsWith("Type error:") ||
        line.startsWith("Module not found:") ||
        line.startsWith("SyntaxError:") ||
        line.match(/^[A-Z]\w+Error:/))
    ) {
      errors.push({ file: pendingFile, message: line });
      pendingFile = null; // consume
    }
  }

  return errors;
}

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

  if (!existsSync(projectPath)) {
    return NextResponse.json(
      { error: `Directory not found: ${projectPath}` },
      { status: 400 },
    );
  }

  try {
    const { stdout, stderr } = await execAsync(
      // --no-lint: skip ESLint during build (we already enforce it via TypeScript)
      "npx next build --no-lint",
      { cwd: projectPath, timeout: 300_000 }, // 5 minutes
    );
    const combined = stdout + stderr;
    return NextResponse.json<BuildResult>({
      success: true,
      errors: [],
      raw: combined,
    });
  } catch (err) {
    const combined =
      (err instanceof Error ? err.message : "") +
      ((err as { stdout?: string }).stdout ?? "") +
      ((err as { stderr?: string }).stderr ?? "");

    const errors = parseBuildErrors(combined);
    return NextResponse.json<BuildResult>({
      success: false,
      errors,
      raw: combined,
    });
  }
}
