'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchConversations, deleteConversation, updateConversationTitle } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import UserMenu from '@/components/UserMenu';
import ThemeToggle from '@/components/ThemeToggle';
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

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 3.5H10M4.5 3.5V2.5C4.5 2 4.8 1.5 5.5 1.5H6.5C7.2 1.5 7.5 2 7.5 2.5V3.5M3 3.5L3.5 10.5C3.5 11 3.8 11 4.2 11H7.8C8.2 11 8.5 11 8.5 10.5L9 3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ConversationItem({
  conv,
  isActive,
  index,
  onRename,
  onDelete,
}: {
  conv: Conversation;
  isActive: boolean;
  index: number;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conv.title ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(conv.title ?? '');
      // focus + select on next tick once the input has mounted
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, conv.title]);

  const commitRename = async () => {
    const next = editValue.trim();
    if (!next || next === conv.title || busy) { setEditing(false); return; }
    setBusy(true);
    try { await onRename(conv.id, next); }
    catch (err) { console.error('Rename failed:', err); }
    finally { setBusy(false); setEditing(false); }
  };

  const confirmDelete = async () => {
    if (busy) return;
    setBusy(true);
    try { await onDelete(conv.id); }
    catch (err) { console.error('Delete failed:', err); setBusy(false); setConfirmingDelete(false); }
    // on success, the parent removes us — no need to reset state
  };

  const stop = (e: React.MouseEvent | React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

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
        onClick={e => { if (editing || confirmingDelete) stop(e); }}
        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-100 relative gap-2"
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

        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            disabled={busy}
            onChange={e => setEditValue(e.target.value)}
            onClick={stop}
            onKeyDown={e => {
              if (e.key === 'Enter') { stop(e); commitRename(); }
              else if (e.key === 'Escape') { stop(e); setEditing(false); }
            }}
            onBlur={() => setEditing(false)}
            className="flex-1 pl-1 bg-transparent outline-none text-sm rounded px-1"
            style={{
              color: 'var(--fg-primary)',
              border: '1px solid var(--accent)',
              background: 'var(--bg-base)',
            }}
          />
        ) : (
          <span className="truncate flex-1 pl-1">{conv.title ?? 'Untitled'}</span>
        )}

        {/* Right cluster */}
        {confirmingDelete ? (
          <div className="flex items-center gap-1 flex-shrink-0" onClick={stop}>
            <span className="text-[10px]" style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
              Delete?
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={e => { stop(e); confirmDelete(); }}
              aria-label="Confirm delete"
              className="p-1 rounded"
              style={{ color: 'var(--danger)' }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5L4.5 8L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={e => { stop(e); setConfirmingDelete(false); }}
              aria-label="Cancel"
              className="p-1 rounded"
              style={{ color: 'var(--fg-muted)' }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 2L9 9M9 2L2 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : editing ? null : (
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              type="button"
              onClick={e => { stop(e); setEditing(true); }}
              aria-label="Rename"
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)')}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={e => { stop(e); setConfirmingDelete(true); }}
              aria-label="Delete"
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)')}
            >
              <TrashIcon />
            </button>
            <span
              className="text-[10px] ml-1"
              style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}
            >
              {relativeTime(conv.createdAt)}
            </span>
          </div>
        )}
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
  onRename,
  onDelete,
  loading,
}: {
  conversations: Conversation[];
  activeConversationId?: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchVisible: boolean;
  setSearchVisible: (v: boolean | ((prev: boolean) => boolean)) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}) {
  const filtered = useMemo(
    () =>
      searchQuery.trim()
        ? conversations.filter(c => (c.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
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
        {loading && conversations.length === 0 ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse h-8 rounded-lg mx-2 mb-1" style={{ background: 'var(--bg-sunken)' }} />
            ))}
          </>
        ) : (
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
                onRename={onRename}
                onDelete={onDelete}
              />
            ))
          )}
        </AnimatePresence>
        )}
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
            '0 0 0 0 rgba(var(--accent-rgb),0)',
            '0 0 20px 2px rgba(var(--accent-rgb),0.12)',
            '0 0 0 0 rgba(var(--accent-rgb),0)',
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="mb-4 flex justify-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '1px solid rgba(var(--accent-rgb),0.2)' }}
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
            background: 'rgba(var(--accent-rgb),0.06)',
            border: '1px solid rgba(var(--accent-rgb),0.2)',
            color: 'var(--accent)',
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(var(--accent-rgb),0.18), transparent)',
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

function StudioLibraryNav({ pathname, onNavigate }: { pathname: string | null; onNavigate: (href: string) => void }) {
  const items: { href: string; label: string; icon: React.ReactNode }[] = [
    {
      href: '/studio',
      label: 'Image Studio',
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5L9.4 5.1L13 6.5L9.4 7.9L8 11.5L6.6 7.9L3 6.5L6.6 5.1L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M12.5 10.5L13 12L14.5 12.5L13 13L12.5 14.5L12 13L10.5 12.5L12 12L12.5 10.5Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      href: '/library',
      label: 'Library',
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="px-4 pb-1 flex flex-col gap-1">
      {items.map(item => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => onNavigate(item.href)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-100"
            style={{
              color: active ? 'var(--accent)' : 'var(--fg-muted)',
              background: active ? 'var(--accent-dim)' : 'transparent',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-sunken)'; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ConversationSidebar({ activeConversationId }: ConversationSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const isLoggedIn = auth.status === 'authenticated';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<SidebarTab>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    setLoading(true);
    (async () => {
      try {
        const convs = await fetchConversations(auth.token!);
        setConversations(convs);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [auth.token, activeConversationId]);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  const handleRename = useCallback(async (id: string, title: string) => {
    if (!auth.token) return;
    try {
      await updateConversationTitle(auth.token, id, title);
      setConversations(prev => prev.map(c => (c.id === id ? { ...c, title } : c)));
    } catch {
      showError('Failed to rename conversation');
    }
  }, [auth.token]);

  const handleDelete = useCallback(async (id: string) => {
    if (!auth.token) return;
    try {
      await deleteConversation(auth.token, id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (id === activeConversationId) router.push('/chat/new');
    } catch {
      showError('Failed to delete conversation');
    }
  }, [auth.token, activeConversationId, router]);

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
          onClick={() => router.push('/chat/new')}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)', boxShadow: 'var(--shadow-soft)' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1V12M1 6.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Studio / Library navigation */}
      <StudioLibraryNav pathname={pathname} onNavigate={(href) => router.push(href)} />

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

      {/* Error banner */}
      {error && (
        <div
          className="mx-3 mb-2 px-3 py-2 rounded-lg text-xs flex items-center justify-between"
          style={{ background: 'rgba(var(--danger-rgb),0.1)', border: '1px solid rgba(var(--danger-rgb),0.3)', color: 'var(--danger)' }}
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

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
            onRename={handleRename}
            onDelete={handleDelete}
            loading={loading}
          />
        ) : (
          <AgentTab key="agent" />
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-2 py-2 border-t flex-shrink-0 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-0">
          {isLoggedIn ? (
            <UserMenu onSignOut={auth.signOut} />
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
        <ThemeToggle />
      </div>
    </motion.aside>
  );
}
