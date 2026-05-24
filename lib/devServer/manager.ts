import { spawn, type ChildProcess } from "child_process";
import { createServer } from "net";

const LOG_RING_SIZE = 300; // max lines kept per project

type ServerEntry = {
  process: ChildProcess;
  pid: number;
  port: number;
  logs: string[]; // ring buffer of recent stdout+stderr lines
};
const servers = new Map<string, ServerEntry>();

/** Return the most-recent dev-server output lines for a project (read-only copy). */
export function getDevServerLogs(projectPath: string): string[] {
  return servers.get(projectPath)?.logs.slice() ?? [];
}

function findFreePort(startPort = 3001): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
    server.on("error", () => resolve(findFreePort(startPort + 1)));
  });
}

/** Poll localhost:port until it responds with HTTP (or timeout). */
async function waitForPort(port: number, timeoutMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}`, {
        signal: AbortSignal.timeout(1000),
      });
      if (res.status < 600) return true;
    } catch {
      // not ready yet — wait 500 ms then retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function startDevServer(
  projectPath: string,
): Promise<{ port: number; url: string }> {
  const existing = servers.get(projectPath);
  if (existing) {
    return { port: existing.port, url: `http://localhost:${existing.port}` };
  }

  const port = await findFreePort(3001);

  const proc = spawn("npm", ["run", "dev", "--", "-p", String(port)], {
    cwd: projectPath,
    shell: true,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const entry: ServerEntry = {
    process: proc,
    pid: proc.pid ?? -1,
    port,
    logs: [],
  };
  servers.set(projectPath, entry);

  function pushLines(raw: Buffer | string) {
    const text = typeof raw === "string" ? raw : raw.toString("utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      entry.logs.push(line);
      if (entry.logs.length > LOG_RING_SIZE) entry.logs.shift();
    }
  }

  proc.stdout?.on("data", pushLines);
  proc.stderr?.on("data", pushLines);
  proc.on("close", () => servers.delete(projectPath));

  // Wait until the server actually responds before returning
  await waitForPort(port);

  return { port, url: `http://localhost:${port}` };
}

export function stopDevServer(projectPath: string): boolean {
  const entry = servers.get(projectPath);
  if (!entry) return false;
  entry.process.kill("SIGTERM");
  servers.delete(projectPath);
  return true;
}

export function getDevServer(
  projectPath: string,
): { port: number; url: string } | undefined {
  const entry = servers.get(projectPath);
  if (!entry) return undefined;
  return { port: entry.port, url: `http://localhost:${entry.port}` };
}
