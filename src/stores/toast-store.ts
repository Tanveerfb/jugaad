import { create } from "zustand";

export type ToastTone = "neutral" | "success" | "error";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  /** How long it stays, ms — the rotor ring counts this down. */
  duration: number;
  /** One action, e.g. Undo. `altText` describes it for screen readers when the toast is announced. */
  action?: { label: string; altText: string; onSelect: () => void };
};

type ToastState = {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, "id" | "tone" | "duration"> & Partial<Pick<ToastItem, "tone" | "duration">>) => string;
  dismiss: (id: string) => void;
};

/** UI state only (project-rules §STATE): what toasts are on screen. */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { tone: "neutral", duration: 8000, ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Shows a toast from anywhere — `toast({ title: "Moved 4 files", action: … })`. */
export const toast = (t: Parameters<ToastState["show"]>[0]) => useToastStore.getState().show(t);
