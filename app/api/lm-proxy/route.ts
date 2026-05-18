import { type NextRequest } from "next/server";

/**
 * Server-side proxy for local LLM providers (Ollama, LM Studio).
 * Bypasses browser CORS restrictions by forwarding requests server-to-server.
 *
 * Usage: set header `x-proxy-target: http://localhost:1234/v1/chat/completions`
 * Only localhost and private-network targets are permitted.
 */

const LOCAL_HOST_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|::1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)$/;

function isLocalUrl(raw: string): boolean {
  try {
    return LOCAL_HOST_RE.test(new URL(raw).hostname);
  } catch {
    return false;
  }
}

async function proxy(req: NextRequest): Promise<Response> {
  const target = req.headers.get("x-proxy-target");

  if (!target || !isLocalUrl(target)) {
    return Response.json(
      { error: "Missing or non-local proxy target" },
      { status: 400 },
    );
  }

  const fwdHeaders = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) fwdHeaders.set("content-type", ct);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: fwdHeaders,
      body:
        req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
      // @ts-expect-error — Node 18+ requires duplex for streaming request bodies
      duplex: "half",
    });
  } catch {
    return Response.json(
      { error: `Could not reach ${target}. Is the LLM server running?` },
      { status: 502 },
    );
  }

  const resHeaders = new Headers({
    "content-type":
      upstream.headers.get("content-type") ?? "application/octet-stream",
    "cache-control": "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export { proxy as GET, proxy as POST };
