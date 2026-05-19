import { type NextRequest } from "next/server";
import { stopDevServer } from "@/lib/devServer/manager";

export async function POST(req: NextRequest): Promise<Response> {
  let body: { projectPath?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { projectPath } = body;
  if (!projectPath) {
    return Response.json({ error: "Missing projectPath" }, { status: 400 });
  }
  const stopped = stopDevServer(projectPath);
  return Response.json({ ok: stopped });
}
