import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves the effective output path for a project.
 * Converts the plan name to a URL-safe slug and nests it under the output folder.
 * e.g. "JugaadApps" + "My Kanban App" → "JugaadApps/my-kanban-app"
 */
export function getProjectOutputPath(
  outputFolder: string,
  planName: string,
): string {
  const slug =
    planName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 60) || "project";
  return `${outputFolder.replace(/[/\\]+$/, "")}/${slug}`;
}
