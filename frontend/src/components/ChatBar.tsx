'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ChatBarProps {
  onSubmit: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  initialValue?: string;
}

export default function ChatBar({
  onSubmit,
  loading = false,
  placeholder = 'Ask anything...',
  autoFocus = false,
  initialValue = '',
}: ChatBarProps) {
  const [value, setValue] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 144) + 'px';
  }, [value]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setValue('');
  }, [value, loading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const canSubmit = value.trim().length > 0 && !loading;

  return (
    <motion.div
      animate={{ scale: focused ? 1.005 : 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="relative w-full"
    >
      <div
        className="flex items-end gap-3 rounded-xl px-4 py-3 transition-all duration-200"
        style={{
          background: 'var(--bg-elevated)',
          border: focused ? '1px solid var(--accent)' : '1px solid var(--fg-subtle)',
          boxShadow: focused
            ? '0 0 0 1px var(--accent), 0 0 24px rgba(0, 212, 255, 0.06)'
            : 'none',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={1}
          disabled={loading}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none disabled:opacity-50"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--fg-primary)',
            maxHeight: '144px',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 disabled:opacity-30"
          style={{
            background: canSubmit ? 'var(--accent)' : 'var(--fg-subtle)',
          }}
          aria-label="Submit"
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-4 h-4 border-2 border-transparent rounded-full"
              style={{ borderTopColor: 'var(--bg-base)' }}
            />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 12V2M7 2L3 6M7 2L11 6"
                stroke={canSubmit ? '#0d0d0d' : '#6b6b6b'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </motion.div>
  );
}
