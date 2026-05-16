export type Role = 'user' | 'assistant';

export type ChatMode = 'fast' | 'thinking';
export type ChatModel =
  | 'gpt-5.5'
  | 'gpt-5.4'
  | 'gpt-5.4-mini';

export interface ChatOptions {
  mode: ChatMode;
  model: ChatModel;
}

export const DEFAULT_CHAT_OPTIONS: ChatOptions = {
  mode: 'fast',
  model: 'gpt-5.4-mini',
};

export interface ChatModelEntry {
  value: ChatModel;
  label: string;
  description: string;
}

export interface ChatModelGroup {
  group: string;
  models: ChatModelEntry[];
}

export const CHAT_MODEL_GROUPS: ChatModelGroup[] = [
  {
    group: 'GPT-5',
    models: [
      { value: 'gpt-5.5',      label: 'GPT-5.5',      description: 'New class of intelligence for coding & professional work' },
      { value: 'gpt-5.4',      label: 'GPT-5.4',      description: 'Affordable model for coding & professional work' },
      { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini',  description: 'Strongest mini for coding, computer use & subagents' },
    ],
  },
];

export const CHAT_MODELS: ChatModelEntry[] = CHAT_MODEL_GROUPS.flatMap(g => g.models);

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  role: Role;
  createdAt: string;
  sources?: Source[];
}

export interface Conversation {
  id: string;
  title: string | null;
  userId: string;
  createdAt: string;
  messages?: Message[];
}

export interface Source {
  title: string;
  url: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  provider: string;
  credits: number;
  createdAt: string;
}
