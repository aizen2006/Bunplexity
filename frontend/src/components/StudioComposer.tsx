'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import ImageControls from '@/components/ImageControls';
import type { ImageOptions } from '@/types';

export type StudioMode = 'generate' | 'edit';

interface StudioComposerProps {
  options: ImageOptions;
  onOptionsChange: (next: ImageOptions) => void;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  referenceFiles: File[];
  onAddReferences: (files: File[]) => void;
  onRemoveReference: (index: number) => void;
  loading: boolean;
  onSubmit: (prompt: string) => void;
}

export default function StudioComposer({
  options,
  onOptionsChange,
  mode,
  onModeChange,
  referenceFiles,
  onAddReferences,
  onRemoveReference,
  loading,
  onSubmit,
}: StudioComposerProps) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [prompt]);

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onAddReferences(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit =
    prompt.trim().length > 0 && !loading && (mode === 'generate' || referenceFiles.length > 0);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(prompt.trim());
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-4"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--fg-subtle)' }}
    >
      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-lg p-1 w-fit" style={{ background: 'var(--bg-base)', border: '1px solid var(--fg-subtle)' }}>
        {(['generate', 'edit'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className="px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors"
            style={{
              fontFamily: 'var(--font-mono)',
              background: mode === m ? 'var(--accent)' : 'transparent',
              color: mode === m ? 'var(--bg-base)' : 'var(--fg-muted)',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Reference images (edit mode) */}
      {mode === 'edit' && (
        <div className="flex flex-wrap items-center gap-2">
          {referenceFiles.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
              style={{ border: '1px solid var(--fg-subtle)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemoveReference(i)}
                aria-label="Remove reference"
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ border: '1px dashed var(--fg-subtle)', color: 'var(--fg-muted)' }}
            aria-label="Add reference image"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3.5V14.5M3.5 9H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        </div>
      )}

      {/* Prompt */}
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
        placeholder={mode === 'generate' ? 'Describe the image you want to create…' : 'Describe how to edit the reference image(s)…'}
        rows={2}
        disabled={loading}
        className="resize-none bg-transparent text-sm leading-relaxed outline-none disabled:opacity-50"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-primary)', maxHeight: '160px' }}
      />

      <ImageControls options={options} onChange={onOptionsChange} disabled={loading} />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
          ⌘/Ctrl + Enter
        </span>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-30"
          style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-transparent rounded-full animate-spin" style={{ borderTopColor: 'var(--bg-base)' }} />
              Generating…
            </>
          ) : (
            mode === 'generate' ? 'Generate' : 'Apply Edit'
          )}
        </motion.button>
      </div>
    </div>
  );
}
