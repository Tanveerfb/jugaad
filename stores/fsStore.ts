import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileTreeNode } from "@/types";

/** @deprecated Use projectPath instead */
export function getStoredFolderName(): string | null {
  if (typeof window === "undefined") return null;
  return useFsStore.getState().baseFolderName;
}

type FsStore = {
  /** Absolute path to the project output folder (persisted). */
  projectPath: string | null;
  baseFolderName: string | null;
  /**
   * Resolved effective path for the CURRENT build (outputFolder/project-slug).
   * Set at the start of executeAll; not persisted.
   */
  activeProjectPath: string | null;
  fileTree: FileTreeNode[];
  selectedFilePath: string | null;
  selectedFileContent: string | null;
  setProjectPath: (path: string) => void;
  setActiveProjectPath: (path: string) => void;
  setFileTree: (tree: FileTreeNode[]) => void;
  selectFile: (path: string, content: string) => void;
  clearSelection: () => void;
  reset: () => void;
};

export const useFsStore = create<FsStore>()(
  persist(
    (set) => ({
      projectPath: null,
      baseFolderName: null,
      activeProjectPath: null,
      fileTree: [],
      selectedFilePath: null,
      selectedFileContent: null,
      setProjectPath: (path) =>
        set({
          projectPath: path,
          baseFolderName: path.split(/[\\/]/).filter(Boolean).pop() ?? path,
          fileTree: [],
        }),
      setActiveProjectPath: (path) => set({ activeProjectPath: path }),
      setFileTree: (tree) => set({ fileTree: tree }),
      selectFile: (path, content) =>
        set({ selectedFilePath: path, selectedFileContent: content }),
      clearSelection: () =>
        set({ selectedFilePath: null, selectedFileContent: null }),
      reset: () =>
        set({
          projectPath: null,
          baseFolderName: null,
          activeProjectPath: null,
          fileTree: [],
          selectedFilePath: null,
          selectedFileContent: null,
        }),
    }),
    {
      name: "jugaad-fs",
      partialize: (s) => ({
        projectPath: s.projectPath,
        baseFolderName: s.baseFolderName,
      }),
    },
  ),
);
