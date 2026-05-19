import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProjectPlan, ConversationMessage, StackConfig } from "@/types";
import { stackOptions } from "@/components/stack/stackRegistry";

const defaultStack: StackConfig = {
  selected: stackOptions.filter((o) => o.default).map((o) => o.id),
};

type ProjectPlanStore = {
  plan: ProjectPlan | null;
  /** Stack selections made before a plan is created (pre-chat phase). */
  pendingStack: StackConfig;
  conversation: ConversationMessage[];
  isPlanning: boolean;
  isPlanConfirmed: boolean;
  /** When true the project page will auto-start the build immediately after tasks load. */
  autoRun: boolean;
  /** Persisted so the progress card survives page reloads/Fast Refresh. */
  isGenerating: boolean;
  generatingStatus: string;
  /** ms timestamp of when the current generation started; used to compute elapsed time after reloads. */
  generatingStartTime: number | null;
  setPlan: (plan: ProjectPlan) => void;
  updatePlan: (partial: Partial<ProjectPlan>) => void;
  setPendingStack: (stack: StackConfig) => void;
  addMessage: (msg: ConversationMessage) => void;
  confirmPlan: () => void;
  resetPlan: () => void;
  setIsPlanning: (v: boolean) => void;
  setAutoRun: (v: boolean) => void;
  startGenerating: () => void;
  setGeneratingStatus: (s: string) => void;
  stopGenerating: () => void;
};

export const useProjectPlanStore = create<ProjectPlanStore>()(
  persist(
    (set) => ({
      plan: null,
      pendingStack: defaultStack,
      conversation: [],
      isPlanning: false,
      isPlanConfirmed: false,
      autoRun: false,
      isGenerating: false,
      generatingStatus: "",
      generatingStartTime: null,
      setPlan: (plan) => set({ plan, isPlanConfirmed: false }),
      updatePlan: (partial) =>
        set((state) =>
          state.plan ? { plan: { ...state.plan, ...partial } } : {},
        ),
      setPendingStack: (stack) => set({ pendingStack: stack }),
      addMessage: (msg) =>
        set((state) => ({ conversation: [...state.conversation, msg] })),
      confirmPlan: () => set({ isPlanConfirmed: true }),
      resetPlan: () =>
        set({
          plan: null,
          pendingStack: defaultStack,
          conversation: [],
          isPlanning: false,
          isPlanConfirmed: false,
          autoRun: false,
          isGenerating: false,
          generatingStatus: "",
          generatingStartTime: null,
        }),
      setIsPlanning: (v) => set({ isPlanning: v }),
      setAutoRun: (v) => set({ autoRun: v }),
      startGenerating: () =>
        set({
          isGenerating: true,
          generatingStatus: "",
          generatingStartTime: Date.now(),
        }),
      setGeneratingStatus: (s) => set({ generatingStatus: s }),
      stopGenerating: () =>
        set({
          isGenerating: false,
          generatingStatus: "",
          generatingStartTime: null,
        }),
    }),
    {
      name: "jugaad-plan",
      partialize: (s) => ({
        plan: s.plan,
        isPlanConfirmed: s.isPlanConfirmed,
        pendingStack: s.pendingStack,
        conversation: s.conversation,
        isGenerating: s.isGenerating,
        generatingStatus: s.generatingStatus,
        generatingStartTime: s.generatingStartTime,
      }),
    },
  ),
);
