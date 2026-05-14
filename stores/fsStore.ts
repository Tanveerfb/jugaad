import { create } from "zustand";
import type { FileTreeNode } from "@/types";

type FsStore = {
  baseFolderHandle: FileSystemDirectoryHandle | null;
  projectHandle: FileSystemDirectoryHandle | null;
  baseFolderName: string | null;
  fileTree: FileTreeNode[];
  selectedFilePath: string | null;
  selectedFileContent: string | null;
  setBaseFolderHandle: (handle: FileSystemDirectoryHandle) => void;
  setProjectHandle: (handle: FileSystemDirectoryHandle) => void;
  setFileTree: (tree: FileTreeNode[]) => void;
  selectFile: (path: string, content: string) => void;
  clearSelection: () => void;
  reset: () => void;
};

export const useFsStore = create<FsStore>((set) => ({
  baseFolderHandle: null,
  projectHandle: null,
  baseFolderName: null,
  fileTree: [],
  selectedFilePath: null,
  selectedFileContent: null,
  setBaseFolderHandle: (handle) =>
    set({ baseFolderHandle: handle, baseFolderName: handle.name }),
  setProjectHandle: (handle) => set({ projectHandle: handle }),
  setFileTree: (tree) => set({ fileTree: tree }),
  selectFile: (path, content) =>
    set({ selectedFilePath: path, selectedFileContent: content }),
  clearSelection: () =>
    set({ selectedFilePath: null, selectedFileContent: null }),
  reset: () =>
    set({
      baseFolderHandle: null,
      projectHandle: null,
      baseFolderName: null,
      fileTree: [],
      selectedFilePath: null,
      selectedFileContent: null,
    }),
}));
