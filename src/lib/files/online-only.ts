import { spawn } from "node:child_process";

/**
 * Cloud placeholders (OneDrive "online-only" files) in the given folders: files whose contents
 * live online, which a read would download (spec: "skip or ask"). Node's `stat` can't see the
 * attributes that mark them, so PowerShell lists them. Listing never downloads anything.
 *
 * PowerShell looks only at the folders it is handed — the ones the scanner's own walk visited,
 * which already skips junctions and protected folders — and never recurses itself, so it can't
 * wander outside the allow-list. Attribute bits: OFFLINE 0x1000, RECALL_ON_OPEN 0x40000,
 * RECALL_ON_DATA_ACCESS 0x400000.
 *
 * Returns full paths, lower-cased for comparison; off Windows, an empty set. **Null if PowerShell
 * fails** — the caller must then not read any file, since any of them could be a placeholder.
 */
export async function listOnlineOnlyFiles(folders: readonly string[]): Promise<Set<string> | null> {
  if (process.platform !== "win32" || folders.length === 0) return new Set();
  const script = [
    "[Console]::InputEncoding = [Text.Encoding]::UTF8",
    "[Console]::OutputEncoding = [Text.Encoding]::UTF8",
    "$mask = 0x441000",
    "foreach ($d in [Console]::In.ReadToEnd() -split \"`n\") {",
    "  $d = $d.TrimEnd(\"`r\"); if (-not $d) { continue }",
    "  Get-ChildItem -LiteralPath $d -File -Force -ErrorAction SilentlyContinue |",
    "    Where-Object { ([int64]$_.Attributes -band $mask) -ne 0 } | ForEach-Object { $_.FullName }",
    "}",
  ].join("\n");

  return new Promise((resolve) => {
    // folder names go in on stdin, never spliced into the script
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (c: Buffer) => chunks.push(c));
    child.on("error", () => resolve(null));
    child.on("close", (code) => {
      if (code !== 0) return resolve(null);
      const out = Buffer.concat(chunks).toString("utf8");
      resolve(new Set(out.split(/\r?\n/).filter(Boolean).map((p) => p.toLowerCase())));
    });
    child.stdin.end(folders.join("\n"), "utf8");
  });
}
