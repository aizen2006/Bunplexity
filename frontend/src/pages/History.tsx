import AppShell from "../components/chat/AppShell";
import HistoryList from "../components/chat/HistoryList";
import { fetchConversations, type ConversationSummary } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

export default function History() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadConversations() {
      try {
        setIsLoading(true);
        const rows = await fetchConversations();
        setConversations(rows);
      } catch {
        setError("Could not load conversation history.");
      } finally {
        setIsLoading(false);
      }
    }
    loadConversations();
  }, []);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = conversations.filter((item) =>
      item.title?.toLowerCase().includes(normalizedQuery),
    );

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt ?? a.created_at ?? 0).getTime();
      const dateB = new Date(b.createdAt ?? b.created_at ?? 0).getTime();
      return sort === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [conversations, query, sort]);

  return (
    <AppShell>
      <div className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8 text-neutral-100">
        <h1 className="text-2xl font-semibold">History</h1>

        <div className="mt-4 flex items-center gap-6 border-b border-white/10 pb-2 text-sm">
          <button className="border-b border-white pb-2">Threads</button>
          <button className="pb-2 text-neutral-500">Artifacts</button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-[#151516] p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your threads..."
            className="w-full rounded-lg border border-white/10 bg-[#1f1f1f] px-3 py-2 text-sm outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-300">
            <button className="rounded-md border border-white/10 px-3 py-1">Select</button>
            <button className="rounded-md border border-white/10 px-3 py-1">Type</button>
            <button className="rounded-md border border-white/10 px-3 py-1">Temporary Threads: Show</button>
            <button
              className="rounded-md border border-white/10 px-3 py-1"
              onClick={() => setSort((prev) => (prev === "newest" ? "oldest" : "newest"))}
            >
              Sort: {sort === "newest" ? "Newest" : "Oldest"}
            </button>
          </div>
        </div>

        {isLoading && <div className="mt-4 text-sm text-neutral-400">Loading threads...</div>}
        {!!error && <div className="mt-4 text-sm text-red-300">{error}</div>}

        {!isLoading && !error && filteredConversations.length === 0 && (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#151516] p-4 text-sm text-neutral-400">
            No threads found.
          </div>
        )}

        {!isLoading && !error && filteredConversations.length > 0 && (
          <HistoryList
            conversations={filteredConversations}
            onOpenConversation={(conversationId) => navigate(`/conversations/${conversationId}`)}
          />
        )}
      </div>
    </AppShell>
  );
}
