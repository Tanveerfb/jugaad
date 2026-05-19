import { create } from "zustand";

export type DevServerStatus =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "error";

type DevServerStore = {
  status: DevServerStatus;
  url: string | null;
  port: number | null;
  error: string | null;
  /** All env var names found in the project */
  envVars: string[];
  /** Vars that have no value in .env.local */
  missingVars: string[];
  /** Whether the right-panel preview tab is shown (one-shot trigger) */
  showPreview: boolean;
  /** Stays true once the user has unlocked the preview panel, even after tasks are done */
  previewUnlocked: boolean;

  setStatus: (status: DevServerStatus) => void;
  setServer: (url: string, port: number) => void;
  setEnvInfo: (vars: string[], missing: string[]) => void;
  setError: (error: string) => void;
  setShowPreview: (show: boolean) => void;
  reset: () => void;
};

export const useDevServerStore = create<DevServerStore>((set) => ({
  status: "idle",
  url: null,
  port: null,
  error: null,
  envVars: [],
  missingVars: [],
  showPreview: false,
  previewUnlocked: false,

  setStatus: (status) => set({ status }),
  setServer: (url, port) => set({ url, port, status: "running" }),
  setEnvInfo: (envVars, missingVars) => set({ envVars, missingVars }),
  setError: (error) => set({ error, status: "error" }),
  setShowPreview: (showPreview) =>
    set({ showPreview, ...(showPreview ? { previewUnlocked: true } : {}) }),
  reset: () =>
    set({
      status: "idle",
      url: null,
      port: null,
      error: null,
      showPreview: false,
    }),
}));
