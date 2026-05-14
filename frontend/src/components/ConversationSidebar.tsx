'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { fetchConversations } from '@/lib/api';
import type { Conversation } from '@/types';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ConversationItem({
  conv,
  isActive,
  index,
}: {
  conv: Conversation;
  isActive: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, transition: { duration: 0.1 } }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.3), ease: 'easeOut' }}
      layout
      className="group"
    >
      <Link
        href={`/chat/${conv.id}`}
        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-100 relative"
        style={{
          color: isActive ? 'var(--fg-primary)' : 'var(--fg-muted)',
          background: isActive ? 'var(--bg-elevated)' : 'transparent',
        }}
      >
        <motion.div
          className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full"
          style={{ background: 'var(--accent)', originY: 0.5 }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={isActive ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
          whileHover={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
        />
        <span className="truncate flex-1 pl-1">{conv.title}</span>
        <span
          className="text-[10px] ml-2 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity duration-150"
          style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
        >
          {relativeTime(conv.createdAt)}
        </span>
      </Link>
    </motion.div>
  );
}

function HistoryTab({
  conversations,
  activeConversationId,
  searchQuery,
  setSearchQuery,
  searchVisible,
  setSearchVisible,
}: {
  conversations: Conversation[];
  activeConversationId?: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchVisible: boolean;
  setSearchVisible: (v: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const filtered = useMemo(
    () =>
      searchQuery.trim()
        ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : conversations,
    [conversations, searchQuery]
  );

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex flex-col flex-1 min-h-0"
    >
      <div className="px-4 py-2 flex items-center justify-between flex-shrink-0">
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
        >
          Recent
        </span>
        <button
          type="button"
          onClick={() => setSearchVisible(v => !v)}
          className="transition-colors duration-150 rounded p-1"
          style={{ color: searchVisible ? 'var(--accent)' : 'var(--fg-muted)' }}
          aria-label="Toggle search"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {searchVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden px-4 pb-2 flex-shrink-0"
          >
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              autoFocus
              className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--fg-subtle)',
                color: 'var(--fg-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2 text-xs"
              style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}
            >
              {searchQuery ? 'No results' : 'No conversations yet'}
            </motion.p>
          ) : (
            filtered.map((conv, i) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConversationId}
                index={i}
              />
            ))
          )}
        </AnimatePresence>
      </nav>
    </motion.div>
  );
}

function AgentTab() {
  return (
    <motion.div
      key="agent"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex-1 flex items-center justify-center p-4"
    >
      <motion.div
        className="relative rounded-2xl p-6 w-full text-center overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--fg-subtle)',
        }}
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(0,212,255,0)',
            '0 0 20px 2px rgba(0,212,255,0.12)',
            '0 0 0 0 rgba(0,212,255,0)',
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="mb-4 flex justify-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L12.5 7.5L18 8.3L14 12.2L15 17.5L10 14.8L5 17.5L6 12.2L2 8.3L7.5 7.5L10 2Z"
                stroke="var(--accent)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="2" fill="var(--accent)" opacity="0.6" />
            </svg>
          </div>
        </div>

        <h3
          className="text-sm font-bold mb-1.5"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--fg-primary)' }}
        >
          Agent Mode
        </h3>
        <p
          className="text-xs mb-4 leading-relaxed"
          style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
        >
          Autonomous multi-step reasoning for complex tasks
        </p>

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium relative overflow-hidden"
          style={{
            background: 'rgba(0,212,255,0.06)',
            border: '1px solid rgba(0,212,255,0.2)',
            color: 'var(--accent)',
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.18), transparent)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
          />
          <span className="relative z-10" style={{ fontFamily: 'var(--font-mono)' }}>Coming Soon</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

type SidebarTab = 'history' | 'agent';

interface ConversationSidebarProps {
  activeConversationId?: string;
}

export default function ConversationSidebar({ activeConversationId }: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setIsLoggedIn(true);
      try {
        const convs = await fetchConversations(session.access_token);
        setConversations(convs);
      } catch { /* ignore */ }
    })();
  }, [activeConversationId]);

  const tabs: { id: SidebarTab; label: string }[] = [
    { id: 'history', label: 'History' },
    { id: 'agent',   label: 'Agent Mode' },
  ];

  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col h-screen w-[280px] flex-shrink-0 border-r"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--fg-subtle)' }}
    >
      {/* Logo */}
      <div className="flex items-center px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--fg-subtle)' }}>
        <Link href="/" className="flex items-center">
          <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            <span style={{ color: 'var(--accent)' }}>Bun</span>
            <span style={{ color: 'var(--fg-primary)' }}>plexity</span>
          </span>
        </Link>
      </div>

      {/* New chat */}
      <div className="px-4 py-3 flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
          style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1V12M1 6.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-4 pt-1">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 text-center py-2 text-xs font-medium transition-colors duration-150"
              style={{ color: activeTab === tab.id ? 'var(--fg-primary)' : 'var(--fg-muted)' }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="sidebar-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{ background: 'var(--accent)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          ))}
        </div>
        <div style={{ borderBottom: '1px solid var(--fg-subtle)' }} />
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'history' ? (
          <HistoryTab
            key="history"
            conversations={conversations}
            activeConversationId={activeConversationId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchVisible={searchVisible}
            setSearchVisible={setSearchVisible}
          />
        ) : (
          <AgentTab key="agent" />
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--fg-subtle)' }}>
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center py-2 rounded-lg text-xs transition-opacity duration-150 hover:opacity-70"
            style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}
          >
            Sign out
          </button>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center py-2 rounded-lg text-xs transition-opacity duration-150 hover:opacity-70"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
          >
            Sign in
          </button>
        )}
      </div>
    </motion.aside>
  );
}
