/** How many of a category folder's files the classifier is shown. */
export const SAMPLES_PER_FOLDER = 4;
const MAX_NAME = 80;

/**
 * A few file names from each category folder that already exists, so the classifier knows
 * what the owner keeps there, not only the folder's name (2026-10-17: the owner's OBS
 * recordings went to review, torn between "Recorded" and "Unprocessed Clips", while
 * "Recorded" held files named exactly like them). Picked evenly across the folder's sorted
 * names so the sample shows its range. Categories with no folder yet get no entry.
 */
export function folderSamples(
  paths: readonly string[],
  categories: readonly string[],
  perFolder = SAMPLES_PER_FOLDER,
): Record<string, string[]> {
  const byFolder = new Map<string, string[]>();
  for (const path of paths) {
    const cut = path.indexOf("\\");
    if (cut < 0) continue;
    const top = path.slice(0, cut).toLowerCase();
    const name = path.slice(path.lastIndexOf("\\") + 1);
    byFolder.set(top, [...(byFolder.get(top) ?? []), name]);
  }
  const samples: Record<string, string[]> = {};
  for (const category of categories) {
    const names = byFolder.get(category.toLowerCase());
    if (!names?.length) continue;
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    const step = sorted.length / Math.min(perFolder, sorted.length);
    samples[category] = Array.from({ length: Math.min(perFolder, sorted.length) }, (_, i) =>
      clip(sorted[Math.floor(i * step)]),
    );
  }
  return samples;
}

function clip(name: string): string {
  return name.length > MAX_NAME ? `${name.slice(0, MAX_NAME - 1)}…` : name;
}
