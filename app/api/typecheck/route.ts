/**
 * Runs a fast, isolated TypeScript type-check on a single generated file.
 *
 * Uses `--noResolve` so module imports are not resolved — this lets us check
 * a file before all its peer files have been written, while still catching
 * syntax errors, unused variables, and intra-file type errors.
 *
 * Returns errors scoped ONLY to the requested file, filtering noise from
 * the rest of the partially-written project.
 */
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const execAsync = promisify(exec);

export type TypecheckError = {
  file: string;
  line: number;
  col: number;
  message: string;
};

type TypecheckResult = {
  errors: TypecheckError[];
  raw: string;
};

/**
 * Parse tsc's plain-text output into structured errors.
 * Format: path/to/file.tsx(line,col): error TSxxxx: message
 */
function parseTscOutput(output: string, targetFile: string): TypecheckError[] {
  const errors: TypecheckError[] = [];
  // Normalize separators for comparison
  const normalizedTarget = targetFile.replace(/\\/g, "/").toLowerCase();

  for (const line of output.split("\n")) {
    const match = line.match(
      /^(.+?)\((\d+),(\d+)\):\s+(?:error|warning)\s+TS\d+:\s+(.+)$/,
    );
    if (!match) continue;

    const [, filePart, lineNum, colNum, message] = match;
    const normalizedFile = filePart.replace(/\\/g, "/").toLowerCase();

    // Only include errors that come from the specific file being checked
    if (!normalizedFile.endsWith(normalizedTarget)) continue;

    errors.push({
      file: filePart.trim(),
      line: parseInt(lineNum, 10),
      col: parseInt(colNum, 10),
      message: message.trim(),
    });
  }

  return errors;
}

export async function POST(req: Request): Promise<NextResponse> {
  let projectPath: unknown;
  let filePath: unknown;

  try {
    const body = (await req.json()) as {
      projectPath?: unknown;
      filePath?: unknown;
    };
    projectPath = body.projectPath;
    filePath = body.filePath;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof projectPath !== "string" || projectPath.trim() === "") {
    return NextResponse.json(
      { error: "projectPath must be a non-empty string" },
      { status: 400 },
    );
  }

  if (typeof filePath !== "string" || filePath.trim() === "") {
    return NextResponse.json(
      { error: "filePath must be a non-empty string" },
      { status: 400 },
    );
  }

  if (!existsSync(projectPath)) {
    return NextResponse.json(
      { error: `Directory not found: ${projectPath}` },
      { status: 400 },
    );
  }

  const absoluteFilePath = path.join(projectPath, filePath);
  if (!existsSync(absoluteFilePath)) {
    return NextResponse.json(
      { error: `File not found: ${absoluteFilePath}` },
      { status: 400 },
    );
  }

  // Skip typecheck for non-TypeScript files
  if (!filePath.match(/\.(tsx?|jsx?)$/)) {
    return NextResponse.json<TypecheckResult>({ errors: [], raw: "" });
  }

  // Isolated check: --noResolve skips module resolution so we can check partial projects.
  // --strict + noUnusedLocals catches the most common quality issues.
  const cmd = [
    "npx tsc",
    "--noEmit",
    "--skipLibCheck",
    "--noResolve",
    "--strict",
    "--noUnusedLocals",
    "--noUnusedParameters",
    "--noImplicitReturns",
    "--jsx preserve",
    "--moduleResolution bundler",
    "--module esnext",
    "--target es2020",
    "--lib es2020,dom,dom.iterable",
    `"${absoluteFilePath}"`,
  ].join(" ");

  try {
    const { stderr } = await execAsync(cmd, {
      cwd: projectPath,
      timeout: 30_000,
    });
    const errors = parseTscOutput(stderr, filePath);
    return NextResponse.json<TypecheckResult>({ errors, raw: stderr });
  } catch (err) {
    // tsc exits with code 1 when there are errors — that's normal
    const output =
      err instanceof Error
        ? err.message
        : `${(err as { stdout?: string }).stdout ?? ""}${(err as { stderr?: string }).stderr ?? ""}`;
    const errors = parseTscOutput(output, filePath);
    return NextResponse.json<TypecheckResult>({ errors, raw: output });
  }
}
