'use client';

import { motion } from 'framer-motion';
import type { Role } from '@/types';

interface MessageBubbleProps {
  role: Role;
  content: string;
  streaming?: boolean;
}

export function parseAnswer(content: string): { answer: string; followUps: string[] } {
  const answerMatch = content.match(/<ANSWER>([\s\S]*?)<\/ANSWER>/i);
  const answer = answerMatch ? answerMatch[1].trim() : content;

  const followUps: string[] = [];
  const followUpsMatch = content.match(/<FOLLOW_UPS>([\s\S]*?)<\/FOLLOW_UPS>/i);
  if (followUpsMatch) {
    const qRegex = /<question>([\s\S]*?)<\/question>/gi;
    let match;
    while ((match = qRegex.exec(followUpsMatch[1])) !== null) {
      followUps.push(match[1].trim());
    }
  }

  return { answer, followUps };
}

function renderInline(text: string) {
  // Render inline `code` spans
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded text-xs"
          style={{
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-surface)',
            color: 'var(--accent)',
            border: '1px solid var(--fg-subtle)',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function AssistantContent({ content, streaming }: { content: string; streaming?: boolean }) {
  const displayContent = streaming ? content : parseAnswer(content).answer;

  const lines = displayContent.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip XML tags from follow-ups block
    if (line.startsWith('<') && (line.includes('FOLLOW_UPS') || line.includes('question') || line.includes('ANSWER'))) {
      i++;
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(
        <pre
          key={blocks.length}
          className="rounded-lg p-4 my-3 overflow-x-auto text-sm leading-relaxed"
          style={{
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--fg-subtle)',
            borderLeft: '2px solid var(--accent)',
            color: 'var(--fg-primary)',
          }}
        >
          {lang && (
            <span
              className="block text-xs mb-2 uppercase tracking-wider"
              style={{ color: 'var(--accent)' }}
            >
              {lang}
            </span>
          )}
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Heading
    if (line.startsWith('## ')) {
      blocks.push(
        <h3
          key={blocks.length}
          className="text-base font-bold mt-4 mb-1"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--fg-primary)' }}
        >
          {line.slice(3)}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(
        <h2
          key={blocks.length}
          className="text-lg font-bold mt-4 mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--fg-primary)' }}
        >
          {line.slice(2)}
        </h2>
      );
      i++;
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push(
      <p key={blocks.length} className="leading-relaxed" style={{ color: 'var(--fg-primary)' }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div className="space-y-2 text-sm">
      {blocks}
      {streaming && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.75 }}
          className="inline-block w-0.5 h-4 ml-0.5 align-middle"
          style={{ background: 'var(--accent)' }}
        />
      )}
    </div>
  );
}

export default function MessageBubble({ role, content, streaming }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {role === 'user' ? (
        <div
          className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--fg-primary)',
            border: '1px solid var(--fg-subtle)',
          }}
        >
          {content}
        </div>
      ) : (
        <div className="w-full">
          <AssistantContent content={content} streaming={streaming} />
        </div>
      )}
    </motion.div>
  );
}
