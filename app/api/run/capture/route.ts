import { getDevServer } from "@/lib/devServer/manager";
import { NextResponse } from "next/server";

/**
 * POST /api/run/capture
 * Server-side fetches the running dev server's HTML and returns a cleaned
 * snippet so the iterate LLM can understand the current rendered page structure.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { projectPath?: string; devUrl?: string };
  if (!body.projectPath) {
    return NextResponse.json({ html: null }, { status: 400 });
  }

  // Use manager-tracked server first; fall back to caller-provided devUrl
  const server = getDevServer(body.projectPath);
  const fetchUrl = server?.url ?? body.devUrl ?? null;
  if (!fetchUrl) {
    return NextResponse.json({ html: null });
  }

  try {
    const res = await fetch(fetchUrl, {
      headers: { "User-Agent": "jugaad-browser-context/1.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ html: null });
    }

    const raw = await res.text();

    // Extract <body> content
    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = bodyMatch ? bodyMatch[1] : raw;

    // Strip script/style tags and HTML comments, collapse whitespace
    const cleaned = body
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 6000);

    return NextResponse.json({ html: cleaned, url: fetchUrl });
  } catch {
    return NextResponse.json({ html: null });
  }
}
