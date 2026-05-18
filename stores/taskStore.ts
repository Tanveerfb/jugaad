import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, TaskStatus } from "@/types";

type TaskStore = {
  tasks: Task[];
  planId: string | null;
  activeTaskId: string | null;
  selectedTaskId: string | null;
  isExecuting: boolean;
  streamBuffer: string;
  buildStartedAt: number | null;
  buildFinishedAt: number | null;
  setTasks: (tasks: Task[], planId?: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  setTaskOutput: (id: string, output: string) => void;
  setTaskError: (id: string, error: string) => void;
  setActiveTask: (id: string | null) => void;
  setSelectedTask: (id: string | null) => void;
  appendToStream: (chunk: string) => void;
  clearStream: () => void;
  resetTasks: () => void;
  setIsExecuting: (v: boolean) => void;
  setBuildStart: () => void;
  setBuildFinish: () => void;
  incrementRetry: (id: string) => void;
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],
      planId: null,
      activeTaskId: null,
      selectedTaskId: null,
      isExecuting: false,
      streamBuffer: "",
      buildStartedAt: null,
      buildFinishedAt: null,
      setTasks: (tasks, planId) => set({ tasks, planId: planId ?? null }),
      updateTaskStatus: (id, status) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        })),
      setTaskOutput: (id, output) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, output } : t)),
        })),
      setTaskError: (id, error) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, error } : t)),
        })),
      setActiveTask: (id) => set({ activeTaskId: id }),
      setSelectedTask: (id) => set({ selectedTaskId: id }),
      appendToStream: (chunk) =>
        set((state) => ({ streamBuffer: state.streamBuffer + chunk })),
      clearStream: () => set({ streamBuffer: "" }),
      resetTasks: () =>
        set({
          tasks: [],
          planId: null,
          activeTaskId: null,
          selectedTaskId: null,
          isExecuting: false,
          streamBuffer: "",
          buildStartedAt: null,
          buildFinishedAt: null,
        }),
      setIsExecuting: (v) => set({ isExecuting: v }),
      setBuildStart: () =>
        set({ buildStartedAt: Date.now(), buildFinishedAt: null }),
      setBuildFinish: () => set({ buildFinishedAt: Date.now() }),
      incrementRetry: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, retryCount: t.retryCount + 1 } : t,
          ),
        })),
    }),
    {
      name: "jugaad-tasks",
      partialize: (s) => ({ tasks: s.tasks, planId: s.planId }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isExecuting = false;
          state.activeTaskId = null;
          state.selectedTaskId = null;
          state.streamBuffer = "";
        }
      },
    },
  ),
);
