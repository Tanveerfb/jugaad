import { type NextRequest } from "next/server";
import { startDevServer } from "@/lib/devServer/manager";

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
  try {
    const result = await startDevServer(projectPath);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
