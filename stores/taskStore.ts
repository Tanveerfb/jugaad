import { create } from "zustand";
import type { Task, TaskStatus } from "@/types";

type TaskStore = {
  tasks: Task[];
  activeTaskId: string | null;
  isExecuting: boolean;
  streamBuffer: string;
  setTasks: (tasks: Task[]) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  setTaskOutput: (id: string, output: string) => void;
  setTaskError: (id: string, error: string) => void;
  setActiveTask: (id: string | null) => void;
  appendToStream: (chunk: string) => void;
  clearStream: () => void;
  resetTasks: () => void;
  setIsExecuting: (v: boolean) => void;
  incrementRetry: (id: string) => void;
};

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  activeTaskId: null,
  isExecuting: false,
  streamBuffer: "",
  setTasks: (tasks) => set({ tasks }),
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
  appendToStream: (chunk) =>
    set((state) => ({ streamBuffer: state.streamBuffer + chunk })),
  clearStream: () => set({ streamBuffer: "" }),
  resetTasks: () =>
    set({
      tasks: [],
      activeTaskId: null,
      isExecuting: false,
      streamBuffer: "",
    }),
  setIsExecuting: (v) => set({ isExecuting: v }),
  incrementRetry: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, retryCount: t.retryCount + 1 } : t,
      ),
    })),
}));
