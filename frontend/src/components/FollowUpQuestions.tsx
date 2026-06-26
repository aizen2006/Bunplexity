'use client';

import { motion } from 'framer-motion';

interface FollowUpQuestionsProps {
  questions: string[];
  onSelect: (q: string) => void;
}

export default function FollowUpQuestions({ questions, onSelect }: FollowUpQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="mt-4"
    >
      <p
        className="text-xs mb-2 uppercase tracking-wider"
        style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
      >
        Follow-ups
      </p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <motion.button
            key={i}
            onClick={() => onSelect(q)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="text-xs px-3.5 py-2 rounded-full text-left transition-all duration-150"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--fg-muted)',
              boxShadow: 'var(--shadow-soft)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--fg-subtle)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)';
            }}
          >
            {q}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
