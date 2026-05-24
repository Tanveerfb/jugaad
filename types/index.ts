export type LLMProvider = "ollama" | "lmstudio";

export type LLMConfig = {
  provider: LLMProvider;
  baseUrl: string;
  model: string;
  temperature: number;
};

export type StackOption = {
  id: string;
  label: string;
  category: "language" | "styling" | "ui" | "database" | "auth" | "utilities";
  default: boolean;
  docUrl: string;
  packageName: string;
};

export type StackConfig = {
  selected: string[]; // StackOption ids
};

export type Feature = {
  id: string;
  title: string;
  description: string;
};

export type Page = {
  id: string;
  name: string;
  route: string;
  description: string;
};

export type DataModel = {
  id: string;
  name: string;
  fields: { name: string; type: string; required: boolean }[];
};

export type ProjectPlan = {
  id: string;
  name: string;
  description: string;
  stack: StackConfig;
  features: Feature[];
  pages: Page[];
  dataModels: DataModel[];
  authStrategy: "none" | "nextauth" | "clerk" | "firebase" | "custom";
  createdAt: number;
  updatedAt: number;
};

export type TaskStatus = "pending" | "running" | "done" | "error" | "split";

export type Task = {
  id: string;
  title: string;
  filePath: string;
  instruction: string;
  dependsOn: string[];
  docsContext: string;
  status: TaskStatus;
  output?: string;
  error?: string;
  retryCount: number;
  /** Auto-generated system task — cannot be skipped or removed by the user. */
  isSystem?: boolean;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
};

export type OverlayQuestion = {
  id: string;
  question: string;
  type: "single_select" | "multi_select" | "text";
  options?: string[];
  answer?: string | string[];
};

export type FileTreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
  taskStatus?: TaskStatus;
};
