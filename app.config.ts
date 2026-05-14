const appConfig = {
  name: "Jugaad",
  tagline: "Hack it together. Ship it fast.",
  description: "Local-first AI scaffolding studio for Next.js projects.",
  logo: {
    icon: "/logo-icon.svg",
    full: "/logo-full.svg",
    alt: "Jugaad logo",
  },
  version: "0.1.0",
  defaults: {
    llm: {
      provider: "ollama" as "ollama" | "lmstudio",
      ollamaBaseUrl: "http://localhost:11434",
      lmstudioBaseUrl: "http://localhost:1234",
      model: "llama3",
      temperature: 0.3,
      maxTokens: 4096,
    },
    output: {
      framework: "nextjs",
    },
  },
  links: {
    docs: "#",
    github: "#",
    feedback: "#",
  },
};

export default appConfig;
