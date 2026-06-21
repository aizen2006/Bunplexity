'use client';
import { getHostname,getFaviconUrl } from '@/lib/urls';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Message, Source } from '@/types';

interface SourcesTabProps {
  messages: Message[];
  liveSources?: Source[];
}

export function collectUniqueSources(messages: Message[], liveSources: Source[] = []): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.sources) continue;
    for (const s of msg.sources) {
      if (!s?.url || seen.has(s.url)) continue;
      seen.add(s.url);
      out.push(s);
    }
  }
  for (const s of liveSources) {
    if (!s?.url || seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out;
}

export default function SourcesTab({ messages, liveSources = [] }: SourcesTabProps) {
  const sources = useMemo(
    () => collectUniqueSources(messages, liveSources),
    [messages, liveSources]
  );

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 space-y-2">
        <p
          className="text-sm"
          style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
        >
          No sources yet. Ask a question to see them appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <p
        className="text-xs mb-4 uppercase tracking-wider"
        style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
      >
        {sources.length} {sources.length === 1 ? 'source' : 'sources'} cited in this conversation
      </p>
      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        variants={{ show: { transition: { staggerChildren: 0.03 } } }}
        initial="hidden"
        animate="show"
      >
        {sources.map((source, i) => (
          <motion.a
            key={source.url + i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
            }}
            className="flex items-start gap-3 p-3 rounded-lg group transition-colors duration-150"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--fg-subtle)',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)')
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--fg-subtle)')
            }
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0"
              style={{ background: 'var(--bg-surface)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getFaviconUrl(source.url)}
                alt=""
                width={16}
                height={16}
                className="rounded-sm opacity-80 group-hover:opacity-100"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-medium leading-snug line-clamp-2"
                style={{ color: 'var(--fg-primary)' }}
              >
                {source.title || getHostname(source.url)}
              </p>
              <p
                className="text-xs mt-1 truncate"
                style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
              >
                {getHostname(source.url)}
              </p>
            </div>
          </motion.a>
        ))}
      </motion.div>
    </div>
  );
}
