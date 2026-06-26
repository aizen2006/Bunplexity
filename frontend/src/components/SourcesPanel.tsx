'use client';
import { getHostname , getFaviconUrl } from '@/lib/urls';
import { motion } from 'framer-motion';
import type { Source } from '@/types';

interface SourcesPanelProps {
  sources: Source[];
  loading?: boolean;
}

function SkeletonCard() {
  return (
    <div
      className="h-16 rounded-[14px] animate-pulse"
      style={{ background: 'var(--bg-sunken)' }}
    />
  );
}


export default function SourcesPanel({ sources, loading = false }: SourcesPanelProps) {
  if (loading && sources.length === 0) {
    return (
      <div className="mb-4">
        <p
          className="text-xs mb-2 uppercase tracking-wider"
          style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
        >
          Sources
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (sources.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4"
    >
      <p
        className="text-xs mb-2 uppercase tracking-wider"
        style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
      >
        Sources
      </p>
      <motion.div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="show"
      >
        {sources.map((source, i) => (
          <motion.a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
            }}
            className="flex items-start gap-2 p-2.5 rounded-[14px] group transition-colors duration-150"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-soft)',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)')
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--fg-subtle)')
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFaviconUrl(source.url)}
              alt=""
              width={14}
              height={14}
              className="mt-0.5 flex-shrink-0 rounded-sm opacity-70 group-hover:opacity-100"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="min-w-0">
              <p
                className="text-xs font-medium line-clamp-2 leading-snug"
                style={{ color: 'var(--fg-primary)' }}
              >
                {source.title}
              </p>
              <p
                className="text-xs mt-0.5 truncate"
                style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
              >
                {getHostname(source.url)}
              </p>
            </div>
          </motion.a>
        ))}
      </motion.div>
    </motion.div>
  );
}
