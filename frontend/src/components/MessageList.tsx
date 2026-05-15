'use client';

import { useEffect, useRef } from 'react';
import MessageBubble, { parseAnswer } from './MessageBubble';
import SourcesPanel from './SourcesPanel';
import FollowUpQuestions from './FollowUpQuestions';
import type { Message, Source } from '@/types';

interface MessageListProps {
  messages: Message[];
  streamingText?: string;
  sources?: Source[];
  streaming?: boolean;
  onFollowUp: (q: string) => void;
}

export default function MessageList({
  messages,
  streamingText = '',
  sources = [],
  streaming = false,
  onFollowUp,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingText]);

  return (
    <div className="flex flex-col gap-6 py-6">
      {messages.map((msg, i) => {
        const isLastAssistant =
          msg.role === 'assistant' && i === messages.length - 1 && !streaming;
        const { followUps } = isLastAssistant ? parseAnswer(msg.content) : { followUps: [] };
        const msgSources = isLastAssistant ? (msg.sources ?? []) : [];

        return (
          <div key={msg.id} className="space-y-3">
            {msg.role === 'assistant' && msgSources.length > 0 && (
              <SourcesPanel sources={msgSources} />
            )}
            <MessageBubble role={msg.role} content={msg.content} />
            {isLastAssistant && followUps.length > 0 && (
              <FollowUpQuestions questions={followUps} onSelect={onFollowUp} />
            )}
          </div>
        );
      })}

      {/* Active streaming turn */}
      {streaming && (
        <div className="space-y-3">
          {sources.length > 0 ? (
            <SourcesPanel sources={sources} />
          ) : (
            <SourcesPanel sources={[]} loading />
          )}
          {streamingText && (
            <MessageBubble role="assistant" content={streamingText} streaming />
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
