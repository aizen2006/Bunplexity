'use client';

import { Suspense, use, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ConversationSidebar from '@/components/ConversationSidebar';
import MessageList from '@/components/MessageList';
import ChatBar from '@/components/ChatBar';
import { supabase } from '@/lib/supabase';
import { fetchConversation, streamChat, AuthError } from '@/lib/api';
import type { ChatModel, ChatOptions, Message, Source } from '@/types';
import { DEFAULT_CHAT_OPTIONS } from '@/types';

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

function ChatContent({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [title, setTitle] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [chatOptions, setChatOptions] = useState<ChatOptions>(DEFAULT_CHAT_OPTIONS);

  const tokenRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);
  const streamingRef = useRef(false);
  const chatOptionsRef = useRef<ChatOptions>(DEFAULT_CHAT_OPTIONS);

  useEffect(() => { streamingRef.current = streaming; }, [streaming]);
  useEffect(() => { chatOptionsRef.current = chatOptions; }, [chatOptions]);

  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Seed mode/model from URL params once on mount
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    const modelParam = searchParams.get('model');
    const validModels: ChatModel[] = ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'];
    const seeded: ChatOptions = {
      mode: modeParam === 'thinking' ? 'thinking' : 'fast',
      model: validModels.includes(modelParam as ChatModel)
        ? (modelParam as ChatModel)
        : DEFAULT_CHAT_OPTIONS.model,
    };
    setChatOptions(seeded);
    chatOptionsRef.current = seeded;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }
      tokenRef.current = session.access_token;
      setAuthReady(true);
    });
  }, [router]);

  // Load existing conversation history
  useEffect(() => {
    if (!authReady || conversationId === 'new') return;
    (async () => {
      try {
        const conv = await fetchConversation(tokenRef.current!, conversationId);
        setTitle(conv.title ?? '');
        setMessages(conv.messages ?? []);
      } catch {
        /* new or not found — start fresh */
      }
    })();
  }, [authReady, conversationId]);

  const sendMessage = useCallback(
    (query: string, options: ChatOptions = chatOptionsRef.current) => {
      if (!tokenRef.current || streamingRef.current) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        conversationId,
        content: query,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, userMsg]);
      setStreamingText('');
      setSources([]);
      setStreamError(null);
      setStreaming(true);
      streamingRef.current = true;

      let accumulatedText = '';
      let resolvedConvId = conversationId;
      let resolvedSources: Source[] = [];

      abortRef.current?.abort();
      const endpoint = messagesRef.current.length > 0 ? '/chat/follow-up' : '/chat';
      abortRef.current = streamChat(tokenRef.current, query, conversationId, options, {
        onConversationId: id => {
          resolvedConvId = id;
          if (conversationId !== id) {
            router.replace(`/chat/${id}`);
          }
        },
        onSources: s => {
          resolvedSources = s;
          setSources(s);
        },
        onChunk: chunk => {
          accumulatedText += chunk;
          setStreamingText(accumulatedText);
        },
        onDone: () => {
          const assistantMsg: Message = {
            id: crypto.randomUUID(),
            conversationId: resolvedConvId,
            content: accumulatedText,
            role: 'assistant',
            createdAt: new Date().toISOString(),
            sources: resolvedSources,
          };
          setMessages(prev => [...prev, assistantMsg]);
          setStreamingText('');
          setStreaming(false);
          streamingRef.current = false;
        },
        onError: err => {
          console.error('Stream error:', err);
          setStreaming(false);
          setStreamingText('');
          streamingRef.current = false;
          if (err instanceof AuthError) {
            router.push('/login');
            return;
          }
          setStreamError(err.message || 'Something went wrong. Please try again.');
        },
      }, endpoint);
    },
    [conversationId, router]
  );

  // Auto-start from ?q= param
  const initialQuery = searchParams.get('q');
  useEffect(() => {
    if (!authReady || startedRef.current || !initialQuery) return;
    startedRef.current = true;
    sendMessage(decodeURIComponent(initialQuery));
  }, [authReady, initialQuery, sendMessage]);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <ConversationSidebar activeConversationId={conversationId} />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header
          className="flex items-center px-6 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--fg-subtle)', background: 'var(--bg-base)' }}
        >
          <motion.h2
            key={title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-semibold truncate"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--fg-primary)' }}
          >
            {title || 'New Conversation'}
          </motion.h2>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6">
            {messages.length === 0 && !streaming ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center justify-center h-48 space-y-2"
              >
                <p
                  className="text-sm"
                  style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  Start a conversation below
                </p>
              </motion.div>
            ) : (
              <MessageList
                messages={messages}
                streamingText={streamingText}
                sources={sources}
                streaming={streaming}
                onFollowUp={sendMessage}
              />
            )}
          </div>
        </div>

        {/* Stream error banner */}
        {streamError && (
          <div className="mx-6 mb-1 px-4 py-2 rounded-lg text-sm flex items-center justify-between" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            <span>{streamError}</span>
            <button onClick={() => setStreamError(null)} className="ml-3 opacity-60 hover:opacity-100 text-xs">✕</button>
          </div>
        )}

        {/* ChatBar */}
        <div
          className="flex-shrink-0 px-6 py-4 border-t"
          style={{ borderColor: 'var(--fg-subtle)', background: 'var(--bg-base)' }}
        >
          <div className="max-w-3xl mx-auto">
            <ChatBar
              onSubmit={sendMessage}
              loading={streaming}
              placeholder="Ask a follow-up..."
              defaultOptions={chatOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="w-5 h-5 border-2 border-transparent rounded-full animate-spin"
        style={{ borderTopColor: 'var(--accent)' }}
      />
    </div>
  );
}

export default function ChatPage({ params }: PageProps) {
  const { conversationId } = use(params);

  return (
    <Suspense fallback={<LoadingState />}>
      <ChatContent conversationId={conversationId} />
    </Suspense>
  );
}
