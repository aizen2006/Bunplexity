'use client';

import { motion } from 'framer-motion';
import type { MediaItem } from '@/types';

function expiresInLabel(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `expires in ${days}d`;
  const hours = Math.floor(ms / 3_600_000);
  return `expires in ${Math.max(1, hours)}h`;
}

interface MediaGalleryProps {
  items: MediaItem[];
  onEdit?: (item: MediaItem) => void;
  loading?: boolean;
  emptyLabel?: string;
}

export default function MediaGallery({ items, onEdit, loading, emptyLabel = 'No images yet' }: MediaGalleryProps) {
  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl animate-pulse bg-white/5" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-xs py-8 text-center" style={{ color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.04 } } }}
    >
      {items.map(item => (
        <motion.div
          key={item.id}
          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          className="group relative aspect-square rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--fg-subtle)', background: 'var(--bg-elevated)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" loading="lazy" />

          {/* Hover overlay */}
          <div
            className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.1) 55%, transparent)' }}
          >
            <div className="flex items-center justify-end gap-1.5">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  aria-label="Edit image"
                  className="flex items-center justify-center w-7 h-7 rounded-lg"
                  style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid var(--accent)', color: 'var(--accent)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M9.5 2L12 4.5L5 11.5H2.5V9L9.5 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <a
                href={item.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download image"
                className="flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid var(--fg-subtle)', color: 'var(--fg-primary)' }}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2V9M7 9L4 6M7 9L10 6M2.5 11.5H11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-[11px] line-clamp-2" style={{ color: '#fff' }}>{item.prompt}</p>
              <div className="flex items-center justify-between">
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  {item.style}
                </span>
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>
                  {expiresInLabel(item.expiresAt)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
