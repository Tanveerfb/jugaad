import { type NextRequest } from "next/server";
import { writeFileSync } from "fs";
import { join } from "path";
import { readEnvLocal } from "@/lib/envScanner";

export async function POST(req: NextRequest): Promise<Response> {
  let body: { projectPath?: string; values?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { projectPath, values } = body;
  if (!projectPath || !values) {
    return Response.json(
      { error: "Missing projectPath or values" },
      { status: 400 },
    );
  }
  try {
    const existing = readEnvLocal(projectPath);
    const merged = { ...existing, ...values };
    const content =
      Object.entries(merged)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n") + "\n";
    writeFileSync(join(projectPath, ".env.local"), content, "utf8");
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
