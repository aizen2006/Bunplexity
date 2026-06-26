'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ChatBar from '@/components/ChatBar';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import type { ChatOptions } from '@/types';
import { DEFAULT_CHAT_OPTIONS } from '@/types';

export default function Home() {
  const router = useRouter();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);

  const [chatOptions, setChatOptions] = useState<ChatOptions>(() => {
    if (typeof window === 'undefined') return DEFAULT_CHAT_OPTIONS;
    try {
      const saved = localStorage.getItem('chatOptions');
      return saved ? { ...DEFAULT_CHAT_OPTIONS, ...JSON.parse(saved) } : DEFAULT_CHAT_OPTIONS;
    } catch { return DEFAULT_CHAT_OPTIONS; }
  });

  // Signed-in users land inside the chat layout
  useEffect(() => {
    if (auth.status === 'authenticated') router.replace('/chat/new');
  }, [auth.status, router]);

  const handleSubmit = (query: string, options: ChatOptions) => {
    if (auth.status !== 'authenticated') {
      router.push('/login');
      return;
    }
    setLoading(true);
    setChatOptions(options);
    try { localStorage.setItem('chatOptions', JSON.stringify(options)); } catch { /* ignore */ }
    const conversationId = crypto.randomUUID();
    router.push(
      `/chat/${conversationId}?q=${encodeURIComponent(query)}&mode=${options.mode}&model=${encodeURIComponent(options.model)}`
    );
  };

  return (
    <main
      className="relative flex flex-col flex-1 items-center justify-center min-h-screen px-4"
      style={{ background: 'var(--canvas-gradient)' }}
    >
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-2xl space-y-10"
      >
        {/* Wordmark */}
        <div className="text-center space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-6xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <span style={{ color: 'var(--accent)' }}>Bun</span>
            <span style={{ color: 'var(--fg-primary)' }}>plexity</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-sm"
            style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
          >
            Search the web. Get answers. Built for developers.
          </motion.p>
        </div>

        {/* ChatBar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <ChatBar
            onSubmit={handleSubmit}
            loading={loading}
            placeholder="Ask anything..."
            autoFocus
            defaultOptions={chatOptions}
          />
        </motion.div>

        {/* Keyboard hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center text-xs"
          style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}
        >
          Press{' '}
          <kbd
            className="px-1.5 py-0.5 rounded text-xs"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--fg-subtle)',
              color: 'var(--fg-muted)',
            }}
          >
            Enter
          </kbd>{' '}
          to search &middot;{' '}
          <kbd
            className="px-1.5 py-0.5 rounded text-xs"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--fg-subtle)',
              color: 'var(--fg-muted)',
            }}
          >
            Shift+Enter
          </kbd>{' '}
          for newline
        </motion.p>
      </motion.div>
    </main>
  );
}
