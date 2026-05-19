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
  thinkingBuffer: string;
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
  appendToThinking: (chunk: string) => void;
  clearThinking: () => void;
  resetTasks: () => void;
  setIsExecuting: (v: boolean) => void;
  setBuildStart: () => void;
  setBuildFinish: () => void;
  incrementRetry: (id: string) => void;
  markAsSplit: (id: string) => void;
  appendTasks: (newTasks: Task[]) => void;
  insertTasksAfter: (refId: string, newTasks: Task[]) => void;
  syncPlanId: (planId: string) => void;
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
      thinkingBuffer: "",
      buildStartedAt: null,
      buildFinishedAt: null,
      setTasks: (tasks, planId) => set({ tasks, planId: planId ?? null }),
      syncPlanId: (planId) => set({ planId }),
      updateTaskStatus: (id, status) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  ...(status === "done" ? { error: undefined } : {}),
                }
              : t,
          ),
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
      clearStream: () => set({ streamBuffer: "", thinkingBuffer: "" }),
      appendToThinking: (chunk) =>
        set((state) => ({ thinkingBuffer: state.thinkingBuffer + chunk })),
      clearThinking: () => set({ thinkingBuffer: "" }),
      resetTasks: () =>
        set({
          tasks: [],
          planId: null,
          activeTaskId: null,
          selectedTaskId: null,
          isExecuting: false,
          streamBuffer: "",
          thinkingBuffer: "",
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
      markAsSplit: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, status: "split" as const } : t,
          ),
        })),
      appendTasks: (newTasks) =>
        set((state) => ({ tasks: [...state.tasks, ...newTasks] })),
      insertTasksAfter: (refId, newTasks) =>
        set((state) => {
          const idx = state.tasks.findIndex((t) => t.id === refId);
          if (idx === -1) return { tasks: [...state.tasks, ...newTasks] };
          const next = [...state.tasks];
          next.splice(idx + 1, 0, ...newTasks);
          return { tasks: next };
        }),
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
          state.thinkingBuffer = "";
          // Reset any tasks stuck in "running" from a previous session.
          state.tasks = state.tasks.map((t) =>
            t.status === "running" ? { ...t, status: "pending" as const } : t,
          );
        }
      },
    },
  ),
);
