export type Role = 'user' | 'assistant';

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
  title: string;
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
