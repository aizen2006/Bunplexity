export type Role = 'user' | 'assistant';

export type ChatMode = 'fast' | 'thinking';
export type ChatModel =
  | 'gpt-5.5'
  | 'gpt-5.5-pro'
  | 'gpt-5.4'
  | 'gpt-5.4-pro'
  | 'gpt-5.4-mini'
  | 'gpt-5.4-nano'
  | 'gpt-5'
  | 'gpt-5-mini'
  | 'gpt-5-nano';

export interface ChatOptions {
  mode: ChatMode;
  model: ChatModel;
}

export const DEFAULT_CHAT_OPTIONS: ChatOptions = {
  mode: 'fast',
  model: 'gpt-5-mini',
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
    group: 'GPT-5.5',
    models: [
      { value: 'gpt-5.5',     label: 'GPT-5.5',     description: 'New class of intelligence' },
      { value: 'gpt-5.5-pro', label: 'GPT-5.5 Pro', description: 'Smarter & more precise' },
    ],
  },
  {
    group: 'GPT-5.4',
    models: [
      { value: 'gpt-5.4',      label: 'GPT-5.4',      description: 'Affordable coding & professional work' },
      { value: 'gpt-5.4-pro',  label: 'GPT-5.4 Pro',  description: 'Smarter GPT-5.4-class responses' },
      { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini', description: 'Strongest mini for coding & agents' },
      { value: 'gpt-5.4-nano', label: 'GPT-5.4 nano', description: 'Cheapest GPT-5.4-class model' },
    ],
  },
  {
    group: 'GPT-5',
    models: [
      { value: 'gpt-5',      label: 'GPT-5',      description: 'Intelligent reasoning, configurable effort' },
      { value: 'gpt-5-mini', label: 'GPT-5 mini', description: 'Cost-sensitive, low latency' },
      { value: 'gpt-5-nano', label: 'GPT-5 nano', description: 'Fastest, most cost-efficient' },
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
