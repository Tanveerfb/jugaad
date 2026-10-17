import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/*
 * Readers that ask a tool already on the PC — ffprobe (installed with ffmpeg), Windows' own
 * tar and PowerShell — about a file, without opening it in Jugaad. Each returns null when the
 * tool is missing or the file isn't what its name says, and the file is then sorted on its name.
 * Paths go in as arguments or through the environment, never spliced into a command.
 */

export type VideoInfo = { seconds: number; width: number; height: number; codec: string; title: string | null };

/** Length, size and codec of a video, from its header (ffprobe reads only what it needs). */
export async function probeVideo(file: string): Promise<VideoInfo | null> {
  try {
    const { stdout } = await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], {
      timeout: 20_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
    const data = JSON.parse(stdout) as {
      format?: { duration?: string; tags?: Record<string, string> };
      streams?: { codec_type?: string; width?: number; height?: number; codec_name?: string }[];
    };
    const video = data.streams?.find((s) => s.codec_type === "video");
    const seconds = Number(data.format?.duration);
    if (!video?.width || !video.height || !Number.isFinite(seconds)) return null;
    return {
      seconds,
      width: video.width,
      height: video.height,
      codec: video.codec_name ?? "unknown",
      title: data.format?.tags?.title ?? data.format?.tags?.TITLE ?? null,
    };
  } catch {
    return null;
  }
}

/** Windows' own tar (bsdtar) reads zip, 7z, rar and tar; Git's GNU tar on the PATH reads none of the first three. */
function systemTar(): string {
  return process.platform === "win32" && process.env.SystemRoot ? path.join(process.env.SystemRoot, "System32", "tar.exe") : "tar";
}

export type ArchiveInfo = { count: number; names: string[] };

/** The file names inside an archive, without unpacking it. */
export async function listArchive(file: string): Promise<ArchiveInfo | null> {
  try {
    const { stdout } = await run(systemTar(), ["-tf", file], { timeout: 20_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    const entries = stdout.split(/\r?\n/).filter((line) => line && !line.endsWith("/"));
    return { count: entries.length, names: entries.slice(0, 40) };
  } catch {
    return null;
  }
}

export type ProgramInfo = { product: string | null; company: string | null; description: string | null; version: string | null };

/** What a Windows program says about itself: product, maker, description, version. */
export async function programInfo(file: string): Promise<ProgramInfo | null> {
  if (process.platform !== "win32") return null;
  try {
    const { stdout } = await run(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "(Get-Item -LiteralPath $env:JUGAAD_FILE).VersionInfo | Select-Object ProductName,CompanyName,FileDescription,ProductVersion | ConvertTo-Json -Compress",
      ],
      { env: { ...process.env, JUGAAD_FILE: file }, timeout: 20_000, windowsHide: true },
    );
    const v = JSON.parse(stdout) as Record<string, string | null>;
    const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
    const info = { product: clean(v.ProductName), company: clean(v.CompanyName), description: clean(v.FileDescription), version: clean(v.ProductVersion) };
    return info.product || info.description ? info : null;
  } catch {
    return null;
  }
}

/** "3 h 12 min", "4 min 05 s", "40 s". */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  if (s >= 60) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
  return `${s} s`;
}
