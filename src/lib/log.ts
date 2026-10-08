/**
 * The worker's log — one line per event on stdout, timestamped. A long-running process needs
 * one; it is not a stray `console.log` (§BUILD). Never log file contents or model output
 * (project-rules §AI: usage, not content).
 */
export function log(event: string, fields: Record<string, string | number | boolean | null> = {}): void {
  const extra = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  process.stdout.write(`${new Date().toISOString()} ${event}${extra ? ` ${extra}` : ""}\n`);
}
