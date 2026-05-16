import type { ChatOptions, Conversation, Source, User } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class AuthError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'AuthError';
  }
}

async function request<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchMe(token: string): Promise<User> {
  return request<User>('/user/me', token);
}

export function fetchConversations(token: string): Promise<Conversation[]> {
  return request<Conversation[]>('/user/conversations', token);
}

export function fetchConversation(token: string, id: string): Promise<Conversation> {
  return request<Conversation>(`/user/conversations/${id}`, token);
}

export interface StreamCallbacks {
  onConversationId: (id: string) => void;
  onSources: (sources: Source[]) => void;
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export function streamChat(
  token: string,
  query: string,
  conversationId: string,
  options: ChatOptions,
  callbacks: StreamCallbacks,
  endpoint: '/chat' | '/chat/follow-up' = '/chat'
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, conversationId, mode: options.mode, model: options.model }),
        signal: controller.signal,
      });

      if (response.status === 401) throw new AuthError();
      if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          if (body?.error) msg = body.error;
        } catch { /* body not JSON — keep generic message */ }
        throw new Error(msg);
      }
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      let currentData = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
          } else if (line === '') {
            // SSE event dispatch on empty line
            if (currentEvent === 'conversation') {
              try { callbacks.onConversationId(JSON.parse(currentData).conversationId); } catch { /* ignore */ }
            } else if (currentEvent === 'delta') {
              try { callbacks.onChunk(JSON.parse(currentData).text); } catch { /* ignore */ }
            } else if (currentEvent === 'sources') {
              try { callbacks.onSources(JSON.parse(currentData)); } catch { /* ignore */ }
            } else if (currentEvent === 'done') {
              callbacks.onDone();
            } else if (currentEvent === 'error') {
              let msg = 'Stream failed';
              try { msg = JSON.parse(currentData).error ?? msg; } catch { /* ignore */ }
              callbacks.onError(new Error(msg));
            }
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError(err as Error);
      }
    }
  })();

  return controller;
}
