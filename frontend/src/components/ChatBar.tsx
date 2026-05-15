'use client';

import { useState, useRef, useCallback, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMode, ChatModel, ChatOptions } from '@/types';
import { CHAT_MODEL_GROUPS, CHAT_MODELS, DEFAULT_CHAT_OPTIONS } from '@/types';

interface ChatBarProps {
  onSubmit: (query: string, options: ChatOptions) => void;
  loading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  initialValue?: string;
  defaultOptions?: Partial<ChatOptions>;
}

function ModeToggle({ mode, onChange, pillId }: { mode: ChatMode; onChange: (m: ChatMode) => void; pillId: string }) {
  return (
    <div
      className="relative flex items-center rounded-full p-0.5 select-none"
      style={{ background: 'var(--bg-base)', border: '1px solid var(--fg-subtle)' }}
    >
      {(['fast', 'thinking'] as const).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className="relative z-10 px-3 py-1 text-xs font-medium rounded-full transition-colors duration-150 capitalize"
          style={{ color: mode === m ? 'var(--bg-base)' : 'var(--fg-muted)' }}
        >
          {m === 'fast' ? 'Fast' : 'Thinking'}
        </button>
      ))}
      <motion.div
        layoutId={pillId}
        className="absolute inset-y-0.5 rounded-full pointer-events-none"
        style={{
          background: 'var(--accent)',
          width: 'calc(50% - 2px)',
          left: mode === 'fast' ? '2px' : 'calc(50% + 0px)',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    </div>
  );
}

function ModelSelector({
  model,
  open,
  onToggle,
  onChange,
}: {
  model: ChatModel;
  open: boolean;
  onToggle: () => void;
  onChange: (m: ChatModel) => void;
}) {
  const selectedLabel = CHAT_MODELS.find(m => m.value === model)?.label ?? model;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all duration-150"
        style={{
          background: open ? 'rgba(0,212,255,0.08)' : 'transparent',
          border: '1px solid',
          borderColor: open ? 'var(--accent)' : 'var(--fg-subtle)',
          color: open ? 'var(--accent)' : 'var(--fg-muted)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedLabel}</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute bottom-full mb-1.5 left-0 rounded-xl overflow-hidden z-50 min-w-[180px]"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--fg-subtle)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              maxHeight: '260px',
              overflowY: 'auto',
            }}
          >
            {CHAT_MODEL_GROUPS.map(group => (
              <div key={group.group}>
                <div
                  className="px-3 py-1.5 text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', background: 'var(--bg-base)' }}
                >
                  {group.group}
                </div>
                {group.models.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => { onChange(m.value); onToggle(); }}
                    className="w-full flex flex-col items-start px-3 py-2 text-left transition-colors duration-100"
                    style={{
                      background: model === m.value ? 'rgba(0,212,255,0.06)' : 'transparent',
                      borderLeft: model === m.value ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                    onMouseEnter={e => {
                      if (model !== m.value) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={e => {
                      if (model !== m.value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-primary)' }}>{m.label}</span>
                    <span className="text-[10px]" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{m.description}</span>
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatBar({
  onSubmit,
  loading = false,
  placeholder = 'Ask anything...',
  autoFocus = false,
  initialValue = '',
  defaultOptions,
}: ChatBarProps) {
  const [value, setValue] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const [mode, setMode] = useState<ChatMode>(defaultOptions?.mode ?? DEFAULT_CHAT_OPTIONS.mode);
  const [model, setModel] = useState<ChatModel>(defaultOptions?.model ?? DEFAULT_CHAT_OPTIONS.model);
  const [modelOpen, setModelOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pillId = useId();

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 144) + 'px';
  }, [value]);

  useEffect(() => {
    if (!modelOpen) return;
    const handler = () => setModelOpen(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelOpen]);

  useEffect(() => {
    if (defaultOptions?.mode) setMode(defaultOptions.mode);
    if (defaultOptions?.model) setModel(defaultOptions.model);
  }, [defaultOptions?.mode, defaultOptions?.model]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed, { mode, model });
    setValue('');
  }, [value, loading, onSubmit, mode, model]);

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
        className="flex flex-col gap-2 rounded-xl px-4 pt-3 pb-2 transition-all duration-200"
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
            <ModeToggle mode={mode} onChange={setMode} pillId={pillId} />
            <ModelSelector
              model={model}
              open={modelOpen}
              onToggle={() => setModelOpen(v => !v)}
              onChange={setModel}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 disabled:opacity-30"
            style={{ background: canSubmit ? 'var(--accent)' : 'var(--fg-subtle)' }}
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
      </div>
    </motion.div>
  );
}
