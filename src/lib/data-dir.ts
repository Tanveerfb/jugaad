import { homedir } from "node:os";
import { join } from "node:path";
import { serverEnv } from "@/lib/env";

/**
 * The app's own data folder (spec: "the SQLite database and journal"). Outside the repo and
 * outside every allow-listed folder, so the Organiser can never index or move it.
 * Default: %LOCALAPPDATA%\Jugaad on Windows, ~/.local/share/jugaad elsewhere;
 * JUGAAD_DATA_DIR overrides.
 */
export function dataDir(): string {
  if (serverEnv.JUGAAD_DATA_DIR) return serverEnv.JUGAAD_DATA_DIR;
  const local = process.env.LOCALAPPDATA;
  return local ? join(local, "Jugaad") : join(homedir(), ".local", "share", "jugaad");
}
