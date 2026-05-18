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
  setPlan: (plan: ProjectPlan) => void;
  updatePlan: (partial: Partial<ProjectPlan>) => void;
  setPendingStack: (stack: StackConfig) => void;
  addMessage: (msg: ConversationMessage) => void;
  confirmPlan: () => void;
  resetPlan: () => void;
  setIsPlanning: (v: boolean) => void;
};

export const useProjectPlanStore = create<ProjectPlanStore>()(
  persist(
    (set) => ({
      plan: null,
      pendingStack: defaultStack,
      conversation: [],
      isPlanning: false,
      isPlanConfirmed: false,
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
        }),
      setIsPlanning: (v) => set({ isPlanning: v }),
    }),
    {
      name: "jugaad-plan",
      partialize: (s) => ({
        plan: s.plan,
        isPlanConfirmed: s.isPlanConfirmed,
        pendingStack: s.pendingStack,
        conversation: s.conversation,
      }),
    },
  ),
);
