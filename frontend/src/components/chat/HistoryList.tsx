import type { ConversationSummary } from "@/lib/api";

type HistoryListProps = {
  conversations: ConversationSummary[];
  onOpenConversation: (conversationId: string) => void;
};

export default function HistoryList({ conversations, onOpenConversation }: HistoryListProps) {
  return (
    <div className="mt-4 space-y-2">
      {conversations.map((conversation) => {
        const createdAt = conversation.createdAt ?? conversation.created_at;
        const prettyDate = createdAt ? new Date(createdAt).toLocaleDateString() : "";

        return (
          <button
            key={conversation.id}
            onClick={() => onOpenConversation(conversation.id)}
            className="w-full rounded-xl border border-white/10 bg-[#151516] px-4 py-3 text-left transition-colors hover:border-white/20 hover:bg-[#1a1a1b]"
          >
            <div className="line-clamp-1 text-sm font-medium text-neutral-100">
              {conversation.title || "Untitled thread"}
            </div>
            <div className="mt-1 line-clamp-1 text-xs text-neutral-500">
              {prettyDate ? `Updated ${prettyDate}` : "No date available"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
