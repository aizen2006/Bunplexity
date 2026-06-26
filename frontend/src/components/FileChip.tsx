'use client';

import type { ProcessedFileResult } from '@/types';

interface FileChipProps {
  file: ProcessedFileResult;
  onRemove: () => void;
}

export default function FileChip({ file, onRemove }: FileChipProps) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm"
      style={{
        background: 'var(--accent-dim)',
        border: '1px solid rgba(var(--accent-rgb), 0.2)',
        color: 'var(--fg-primary)',
        maxWidth: '100%',
      }}
    >
      <span className="truncate" style={{ maxWidth: '180px' }}>
        {file.fileName}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove attached file"
        className="text-sm font-medium leading-none"
        style={{ color: 'var(--fg-muted)' }}
      >
        ×
      </button>
    </div>
  );
}
