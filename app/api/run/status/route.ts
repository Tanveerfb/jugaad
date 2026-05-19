import { type NextRequest } from "next/server";
import { getDevServer } from "@/lib/devServer/manager";

export async function GET(req: NextRequest): Promise<Response> {
  const projectPath = req.nextUrl.searchParams.get("projectPath");
  if (!projectPath) {
    return Response.json({ error: "Missing projectPath" }, { status: 400 });
  }
  const entry = getDevServer(projectPath);
  if (!entry) return Response.json({ running: false });
  return Response.json({ running: true, port: entry.port, url: entry.url });
}
