import { realpath, stat } from "node:fs/promises";
import type { WorkbenchStore } from "@/lib/data";
import { FOLDER_REFUSAL_TEXT, checkAllowedFolder } from "@/lib/domain/path-guard";
import type { AllowedFolder } from "@/schemas/allowed-folder-schema";

export type AllowFolderResult = { ok: true; folder: AllowedFolder } | { ok: false; reason: string };

/**
 * Adds a pasted path to the allow-list (owner's choice: paste, not browse — nothing outside the
 * list is ever listed). The path is resolved through junctions first, so the check and every
 * later containment test see the real location.
 */
export async function allowFolder(
  store: WorkbenchStore,
  pasted: string,
  protectedPaths: readonly string[],
): Promise<AllowFolderResult> {
  const trimmed = pasted.trim().replace(/^"(.*)"$/, "$1"); // Explorer's "Copy as path" adds quotes
  const precheck = checkAllowedFolder(trimmed, [], protectedPaths);
  if (precheck) return { ok: false, reason: FOLDER_REFUSAL_TEXT[precheck] };

  let real: string;
  try {
    real = await realpath(trimmed);
    if (!(await stat(real)).isDirectory()) return { ok: false, reason: "That's a file. Paste the folder that holds it." };
  } catch {
    return { ok: false, reason: "No folder at that path. Check it and paste it again." };
  }

  // checked again on the real path: a junction can lead into a protected folder
  const existing = store.listAllowedFolders().map((f) => f.path);
  const refusal = checkAllowedFolder(real, existing, protectedPaths);
  if (refusal) return { ok: false, reason: FOLDER_REFUSAL_TEXT[refusal] };
  return { ok: true, folder: store.allowFolder(real) };
}
