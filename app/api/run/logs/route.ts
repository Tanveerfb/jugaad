import { getDevServerLogs } from "@/lib/devServer/manager";
import { NextResponse } from "next/server";

/**
 * GET /api/run/logs?projectPath=...&lines=100
 * Returns the most-recent dev-server terminal output for a project so the
 * iterate LLM can see compilation errors and Next.js warnings.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectPath = searchParams.get("projectPath");
  if (!projectPath) {
    return NextResponse.json({ logs: [] }, { status: 400 });
  }

  const maxLines = Math.min(Number(searchParams.get("lines") ?? "150"), 300);

  const all = getDevServerLogs(projectPath);
  const logs = all.slice(-maxLines);

  return NextResponse.json({ logs });
}
