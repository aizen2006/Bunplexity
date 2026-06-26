'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import { uploadFile } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { ProcessedFileResult } from '@/types';

interface FileUploadButtonProps {
  onFileAttach?: (file: File) => void;
  onFileProcessed: (result: ProcessedFileResult) => void;
}

export default function FileUploadButton({ onFileAttach, onFileProcessed }: FileUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const auth = useAuth();

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!auth.token) {
      console.error('Cannot upload file: not authenticated');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    onFileAttach?.(file);
    setUploading(true);

    try {
      const result = await uploadFile(auth.token, file);
      onFileProcessed(result);
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.csv,.txt"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        aria-label="Upload file"
        className="relative flex items-center justify-center w-8 h-8 rounded-full transition-colors disabled:opacity-50"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--fg-muted)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        {uploading ? (
          <span
            className="w-4 h-4 border-2 border-transparent rounded-full animate-spin"
            style={{ borderTopColor: 'var(--fg-muted)' }}
          />
        ) : (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M6.25 7.5V3.75a3.75 3.75 0 017.5 0V10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M5 10.625V14.3a3.7 3.7 0 003.7 3.7h6.6a3.7 3.7 0 003.7-3.7V8.125a3.7 3.7 0 00-3.7-3.7H11.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}
