import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LLMConfig, LLMProvider } from "@/types";
import appConfig from "@/app.config";

type LLMConfigStore = LLMConfig & {
  setProvider: (provider: LLMProvider) => void;
  setBaseUrl: (url: string) => void;
  setModel: (model: string) => void;
  setTemperature: (t: number) => void;
  reset: () => void;
};

const defaultConfig: LLMConfig = {
  provider: appConfig.defaults.llm.provider,
  baseUrl: appConfig.defaults.llm.ollamaBaseUrl,
  model: appConfig.defaults.llm.model,
  temperature: appConfig.defaults.llm.temperature,
};

export const useLLMConfigStore = create<LLMConfigStore>()(
  persist(
    (set) => ({
      ...defaultConfig,
      setProvider: (provider) =>
        set({
          provider,
          baseUrl:
            provider === "ollama"
              ? appConfig.defaults.llm.ollamaBaseUrl
              : appConfig.defaults.llm.lmstudioBaseUrl,
        }),
      setBaseUrl: (url) => set({ baseUrl: url }),
      setModel: (model) => set({ model }),
      setTemperature: (temperature) => set({ temperature }),
      reset: () => set(defaultConfig),
    }),
    { name: "llm-config" },
  ),
);
