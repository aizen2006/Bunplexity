'use client';

import { motion } from 'framer-motion';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

// Strip the answer/follow-up control tags for display — tolerant of partial
// (still-streaming) output where the closing tag hasn't arrived yet.
function cleanForDisplay(content: string): string {
  return content
    .replace(/<FOLLOW_UPS>[\s\S]*?(?:<\/FOLLOW_UPS>|$)/i, '')
    .replace(/<\/?ANSWER>/gi, '')
    .replace(/<\/?question>/gi, '')
    .trim();
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="text-lg font-bold mt-4 mb-2 first:mt-0" style={{ fontFamily: 'var(--font-heading)', color: 'var(--fg-primary)' }}>
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="text-base font-bold mt-4 mb-1.5 first:mt-0" style={{ fontFamily: 'var(--font-heading)', color: 'var(--fg-primary)' }}>
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-sm font-semibold mt-3 mb-1 first:mt-0" style={{ fontFamily: 'var(--font-heading)', color: 'var(--fg-primary)' }}>
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="leading-relaxed" style={{ color: 'var(--fg-primary)' }}>{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: 'var(--fg-primary)' }}>{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 transition-opacity hover:opacity-80"
      style={{ color: 'var(--accent)' }}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-1 marker:text-[color:var(--fg-faint)]" style={{ color: 'var(--fg-primary)' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-1 marker:text-[color:var(--fg-muted)]" style={{ color: 'var(--fg-primary)' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote
      className="my-3 pl-3 py-1 italic"
      style={{ borderLeft: '3px solid var(--accent)', color: 'var(--fg-muted)' }}
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4" style={{ borderColor: 'var(--border)' }} />,
  pre: ({ children }) => (
    <pre
      className="rounded-[14px] p-4 my-3 overflow-x-auto text-sm leading-relaxed"
      style={{
        fontFamily: 'var(--font-mono)',
        background: 'var(--bg-sunken)',
        border: '1px solid var(--border)',
        borderLeft: '2px solid var(--accent)',
        color: 'var(--fg-primary)',
      }}
    >
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? '') || String(children).includes('\n');
    if (isBlock) {
      // Rendered inside the styled <pre> wrapper above.
      return <code className={className} {...props}>{children}</code>;
    }
    return (
      <code
        className="px-1 py-0.5 rounded text-[0.85em]"
        style={{
          fontFamily: 'var(--font-mono)',
          background: 'var(--bg-sunken)',
          color: 'var(--accent)',
          border: '1px solid var(--border)',
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full text-sm border-collapse" style={{ color: 'var(--fg-primary)' }}>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left font-semibold px-3 py-1.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sunken)' }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>{children}</td>
  ),
};

function AssistantContent({ content, streaming }: { content: string; streaming?: boolean }) {
  const displayContent = cleanForDisplay(streaming ? content : parseAnswer(content).answer);

  return (
    <div className="space-y-2 text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {displayContent}
      </ReactMarkdown>
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
          className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background: 'var(--bg-sunken)',
            color: 'var(--fg-primary)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-soft)',
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
