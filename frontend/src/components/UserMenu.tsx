'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchMe } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';

interface UserMenuProps {
  onSignOut: () => void;
}

function Avatar({ name, size }: { name: string | undefined; size: number }) {
  const letter = (name?.[0] ?? '?').toUpperCase();
  return (
    <div
      className="flex items-center justify-center rounded-full font-medium select-none"
      style={{
        width: size,
        height: size,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--fg-subtle)',
        color: 'var(--accent)',
        fontFamily: 'var(--font-mono)',
        fontSize: size <= 32 ? 13 : 16,
      }}
    >
      {letter}
    </div>
  );
}

export default function UserMenu({ onSignOut }: UserMenuProps) {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.token) return;
    let cancelled = false;
    fetchMe(auth.token)
      .then(u => { if (!cancelled) setUser(u); })
      .catch(() => { /* leave user as null */ });
    return () => { cancelled = true; };
  }, [auth.token]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openNow = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Open user menu"
        className="w-full flex items-center gap-2 px-2 py-1 rounded-lg transition-colors duration-150"
        style={{ background: 'transparent' }}
        onMouseEnter={e =>
          ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)')
        }
        onMouseLeave={e =>
          ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
        }
      >
        <Avatar name={user?.name} size={32} />
        <div className="flex-1 min-w-0 text-left">
          <p
            className="text-xs font-medium truncate"
            style={{ color: 'var(--fg-primary)' }}
          >
            {user?.name ?? 'Loading…'}
          </p>
          <p
            className="text-[10px] truncate"
            style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {user?.email ?? ''}
          </p>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden z-50"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--fg-subtle)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="flex items-center gap-3 p-3"
              style={{ borderBottom: '1px solid var(--fg-subtle)' }}
            >
              <Avatar name={user?.name} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--fg-primary)' }}>
                  {user?.name ?? '—'}
                </p>
                <p
                  className="text-[11px] truncate"
                  style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  {user?.email ?? ''}
                </p>
              </div>
            </div>

            <div className="px-3 py-2.5 space-y-2">
              {user?.provider && (
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    Provider
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] capitalize"
                    style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--fg-subtle)',
                      color: 'var(--fg-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {user.provider}
                  </span>
                </div>
              )}
              {typeof user?.credits === 'number' && (
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    Credits
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
                  >
                    {user.credits}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full text-left px-3 py-2.5 text-xs transition-colors"
              style={{
                color: 'var(--fg-muted)',
                fontFamily: 'var(--font-mono)',
                borderTop: '1px solid var(--fg-subtle)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
