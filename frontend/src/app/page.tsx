'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import ChatBar from '@/components/ChatBar';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (query: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setLoading(true);
    const conversationId = crypto.randomUUID();
    router.push(`/chat/${conversationId}?q=${encodeURIComponent(query)}`);
  };

  return (
    <main
      className="flex flex-col flex-1 items-center justify-center min-h-screen px-4"
      style={{
        background: 'var(--bg-base)',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
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
