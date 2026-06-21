import type { ChatOptions, Conversation, Source, User, ImageOptions, MediaItem, ProcessedFileResult } from '@/types';

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

export async function fetchMe(token: string): Promise<User> {
  const res = await request<{ user: User }>('/user/me', token);
  return res.user;
}

export function fetchConversations(token: string): Promise<Conversation[]> {
  return request<Conversation[]>('/user/conversations', token);
}

export function fetchConversation(token: string, id: string): Promise<Conversation> {
  return request<Conversation>(`/user/conversations/${id}`, token);
}

export function deleteConversation(token: string, id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/user/conversation/${id}`, token, { method: 'DELETE' });
}

export function updateConversationTitle(
  token: string,
  conversationId: string,
  title: string,
): Promise<{ ok: true; title: string }> {
  return request<{ ok: true; title: string }>(`/user/conversation`, token, {
    method: 'PATCH',
    body: JSON.stringify({ conversationId, title }),
  });
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
  fileContext?: string,
  endpoint: '/chat' | '/chat/follow-up' = '/chat'
): AbortController {
  const controller = new AbortController();

  (async () => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          conversationId,
          mode: options.mode,
          model: options.model,
          file_content: fileContext,
        }),
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

      timeoutId = setTimeout(() => {
        controller.abort();
        callbacks.onError(new Error('Stream timed out'));
      }, 30_000);

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
            currentData += (currentData ? '\n' : '') + line.slice(6);
          } else if (line === '') {
            // SSE event dispatch on empty line
            if (currentEvent === 'conversation') {
              try { callbacks.onConversationId(JSON.parse(currentData).conversationId); } catch (e) { console.warn('[SSE parse error]', currentEvent, currentData, e); }
            } else if (currentEvent === 'delta') {
              try { callbacks.onChunk(JSON.parse(currentData).text); } catch (e) { console.warn('[SSE parse error]', currentEvent, currentData, e); }
            } else if (currentEvent === 'sources') {
              try { callbacks.onSources(JSON.parse(currentData)); } catch (e) { console.warn('[SSE parse error]', currentEvent, currentData, e); }
            } else if (currentEvent === 'done') {
              clearTimeout(timeoutId);
              callbacks.onDone();
            } else if (currentEvent === 'error') {
              let msg = 'Stream failed';
              try { msg = JSON.parse(currentData).error ?? msg; } catch (e) { console.warn('[SSE parse error]', currentEvent, currentData, e); }
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
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  })();

  return controller;
}

export interface TranscribeCallbacks {
  onDelta: (text: string) => void;
  onDone:  (finalText: string) => void;
  onError: (err: Error) => void;
}

export function transcribeAudio(
  token: string,
  blob: Blob,
  callbacks: TranscribeCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE}/transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'audio/webm',
          Authorization: `Bearer ${token}`,
        },
        body: blob,
        signal: controller.signal,
      });

      if (response.status === 401) throw new AuthError();
      if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          if (body?.error) msg = body.error;
        } catch(e){ console.warn(`Error:${e}`) }
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
            if (currentEvent === 'delta') {
              try { callbacks.onDelta(JSON.parse(currentData).text); } catch (e) { console.warn('[SSE parse error]', currentEvent, currentData, e); }
            } else if (currentEvent === 'done') {
              let finalText = '';
              try { finalText = JSON.parse(currentData).text ?? ''; } catch (e) { console.warn('[SSE parse error]', currentEvent, currentData, e); }
              callbacks.onDone(finalText);
            } else if (currentEvent === 'error') {
              let msg = 'Transcription failed';
              try { msg = JSON.parse(currentData).error ?? msg; } catch (e) { console.warn('[SSE parse error]', currentEvent, currentData, e); }
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

// ── File upload (documents → parsed text for chat context) ───────────────────

export async function uploadFile(token: string, file: File): Promise<ProcessedFileResult> {
  const formData = new FormData();
  // Backend multer expects the `docs` field (uploadMiddleware.array('docs', 5))
  formData.append('docs', file);

  const res = await fetch(`${API_BASE}/upload/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

  const json = (await res.json()) as { file_content?: string };
  return { fileName: file.name, fileContext: json.file_content ?? '' };
}

// ── Image generation / editing (Studio) ──────────────────────────────────────

export interface SavedImage {
  id: string;
  url: string;
  createdAt: string;
  expiresAt: string;
}

export interface ImageStreamCallbacks {
  onPartial: (b64: string, index: number) => void;
  onSaved: (image: SavedImage) => void;
  onError: (err: Error) => void;
  onDone?: () => void;
}

/**
 * Reads the image SSE stream. Unlike chat, the image routes emit bare
 * `data: { type, ... }` frames (no `event:` line), so we key off `type`.
 * No idle timeout — image generation can legitimately take well over 30s.
 */
async function readImageStream(response: Response, callbacks: ImageStreamCallbacks) {
  if (response.status === 401) throw new AuthError();
  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try { const b = await response.json(); if (b?.message) msg = b.message; } catch { /* keep generic */ }
    throw new Error(msg);
  }
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      let frame: { type: string; image?: string; index?: number; message?: string } & Partial<SavedImage>;
      try { frame = JSON.parse(line.slice(6)); } catch (e) { console.warn('[image SSE parse error]', line, e); continue; }

      if (frame.type === 'partial' && frame.image) {
        callbacks.onPartial(frame.image, frame.index ?? 0);
      } else if (frame.type === 'saved' && frame.id && frame.url) {
        callbacks.onSaved({ id: frame.id, url: frame.url, createdAt: frame.createdAt!, expiresAt: frame.expiresAt! });
      } else if (frame.type === 'error') {
        callbacks.onError(new Error(frame.message ?? 'Image generation failed'));
      }
    }
  }
  callbacks.onDone?.();
}

export function generateImage(
  token: string,
  prompt: string,
  options: ImageOptions,
  callbacks: ImageStreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE}/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: prompt, ...options }),
        signal: controller.signal,
      });
      await readImageStream(response, callbacks);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') callbacks.onError(err as Error);
    }
  })();

  return controller;
}

export function editImage(
  token: string,
  prompt: string,
  options: ImageOptions,
  files: File[],
  callbacks: ImageStreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const formData = new FormData();
      formData.append('query', prompt);
      formData.append('style', options.style);
      formData.append('size', options.size);
      formData.append('quality', options.quality);
      formData.append('model', options.model);
      formData.append('output_format', options.output_format);
      // Backend expects reference images under the `images` field
      files.forEach((f) => formData.append('images', f));

      const response = await fetch(`${API_BASE}/image/edit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets the multipart boundary
        body: formData,
        signal: controller.signal,
      });
      await readImageStream(response, callbacks);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') callbacks.onError(err as Error);
    }
  })();

  return controller;
}

export async function fetchLibrary(token: string): Promise<MediaItem[]> {
  const res = await request<{ data: MediaItem[] }>('/image/history', token);
  return res.data ?? [];
}
