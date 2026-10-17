import { dataDir } from "@/lib/data-dir";
import { protectedFolders } from "@/lib/domain/path-guard";

/** This machine's protected folders: Windows, program folders, AppData, recycle bins and Jugaad's own data. */
export function machineProtectedPaths(): string[] {
  return protectedFolders(process.env, dataDir());
}
