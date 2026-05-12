'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { fetchConversations } from '@/lib/api';
import type { Conversation } from '@/types';

interface ConversationSidebarProps {
  activeConversationId?: string;
}

export default function ConversationSidebar({ activeConversationId }: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const convs = await fetchConversations(session.access_token);
        setConversations(convs);
      } catch {
        /* ignore */
      }
    })();
  }, [activeConversationId]);

  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col h-screen w-[280px] flex-shrink-0 border-r"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--fg-subtle)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-5 py-4 border-b"
        style={{ borderColor: 'var(--fg-subtle)' }}
      >
        <Link href="/" className="flex items-center">
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <span style={{ color: 'var(--accent)' }}>Bun</span>
            <span style={{ color: 'var(--fg-primary)' }}>plexity</span>
          </span>
        </Link>
      </div>

      {/* New chat */}
      <div className="px-4 py-3">
        <button
          onClick={() => router.push('/')}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
          style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
              d="M6.5 1V12M1 6.5H12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversations */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {conversations.length === 0 ? (
          <p
            className="px-3 py-2 text-xs"
            style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}
          >
            No conversations yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {conversations.map(conv => {
              const isActive = conv.id === activeConversationId;
              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className="flex items-center px-3 py-2 rounded-lg text-sm truncate transition-colors duration-100"
                  style={{
                    color: isActive ? 'var(--fg-primary)' : 'var(--fg-muted)',
                    background: isActive ? 'var(--bg-elevated)' : 'transparent',
                    borderLeft: isActive
                      ? '2px solid var(--accent)'
                      : '2px solid transparent',
                  }}
                >
                  <span className="truncate">{conv.title}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </motion.aside>
  );
}
