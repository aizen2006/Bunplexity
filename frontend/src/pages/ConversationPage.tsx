import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { supabase } from "@/lib/client";
import AppShell from "../components/chat/AppShell";
import MessageList from "../components/chat/MessageList";
import FollowupBox from "../components/chat/FollowupBox";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type SseEvent = {
  event: string;
  data: string;
};

function parseSseEvents(buffer: string): { events: SseEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: SseEvent[] = [];

  for (const part of parts) {
    const lines = part.split("\n");
    let event = "message";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    events.push({ event, data });
  }

  return { events, rest };
}

export default function ConversationPage() {
  const { conversationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const pendingAssistantTextRef = useRef("");
  const flushTimerRef = useRef<number | null>(null);
  const hasBootstrappedRef = useRef(false);
  const isNewConversation = conversationId === "new";
  const initialQuery = useMemo(() => searchParams.get("query")?.trim() ?? "", [searchParams]);
  const followupSuggestions = [
    "Compare alternatives with pricing",
    "Give me an implementation checklist",
    "Summarize this in a table",
    "List integration considerations",
  ];

  const flushAssistant = () => {
    if (!pendingAssistantTextRef.current) return;
    const chunk = pendingAssistantTextRef.current;
    pendingAssistantTextRef.current = "";
    setMessages((prev) => {
      if (!prev.length || prev[prev.length - 1]?.role !== "assistant") {
        return [...prev, { id: crypto.randomUUID(), role: "assistant", content: chunk }];
      }
      const next = [...prev];
      const last = next[next.length - 1]!;
      next[next.length - 1] = { ...last, content: last.content + chunk };
      return next;
    });
  };

  const scheduleFlush = () => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flushAssistant();
    }, 40);
  };

  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function loadConversationHistory() {
      if (!conversationId || isNewConversation) return;
      const { data } = await supabase.auth.getSession();
      const jwt = data.session?.access_token;
      if (!jwt) {
        navigate("/auth");
        return;
      }

      const res = await fetch(`${process.env.BUN_PUBLIC_API_URL}/conversations/${conversationId}/messages`, {
        headers: { Authorization: jwt },
      });
      if (!res.ok) return;
      const payload = await res.json();
      const list = (payload.messages ?? []) as Array<{ id: string; role: "user" | "assistant"; content: string }>;
      setMessages([...list].reverse().map((m) => ({ id: m.id, role: m.role, content: m.content })));
    }
    loadConversationHistory();
  }, [conversationId, isNewConversation, navigate]);

  const streamChat = async (body: Record<string, string>, isFollowup: boolean) => {
    const { data } = await supabase.auth.getSession();
    const jwt = data.session?.access_token;
    if (!jwt) {
      navigate("/auth");
      return;
    }

    const endpoint = isFollowup ? "/chat/followup" : "/chat";
    const res = await fetch(`${process.env.BUN_PUBLIC_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: jwt,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) return;

    setIsStreaming(true);
    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let textBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSseEvents(textBuffer);
      textBuffer = rest;

      for (const event of events) {
        if (event.event === "conversation") {
          const payload = JSON.parse(event.data) as { conversationId: string };
          if (payload.conversationId) {
            navigate(`/conversations/${payload.conversationId}`, { replace: true });
            setSearchParams({});
          }
        }
        if (event.event === "token") {
          const payload = JSON.parse(event.data) as { text: string };
          if (payload.text) {
            pendingAssistantTextRef.current += payload.text;
            scheduleFlush();
          }
        }
      }
    }

    flushAssistant();
    setIsStreaming(false);
  };

  useEffect(() => {
    async function bootstrapNewConversation() {
      if (!isNewConversation || !initialQuery || hasBootstrappedRef.current) return;
      hasBootstrappedRef.current = true;
      setMessages([{ id: crypto.randomUUID(), role: "user", content: initialQuery }]);
      await streamChat({ query: initialQuery }, false);
    }
    bootstrapNewConversation();
  }, [initialQuery, isNewConversation]);

  async function handleFollowupSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || !conversationId || isNewConversation || isStreaming) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
    setQuery("");
    await streamChat({ convId: conversationId, query: trimmed }, true);
  }

  return (
    <AppShell>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-6 text-white">
        <div className="mb-5 flex items-center gap-6 border-b border-white/10 pb-2 text-sm text-neutral-400">
          <button className="border-b border-white pb-2 text-white">Answer</button>
          <button className="pb-2 hover:text-white">Links</button>
          <button className="pb-2 hover:text-white">Images</button>
        </div>

        <div className="mb-3 text-sm text-neutral-500">
          {isStreaming ? "Working on response..." : "Completed steps"}
        </div>

        <div className="flex-1 overflow-y-auto pb-2">
          <MessageList messages={messages} />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-[#151516] p-4">
          <div className="mb-2 text-sm font-medium text-neutral-300">Follow-ups</div>
          <div className="flex flex-wrap gap-2">
            {followupSuggestions.map((item) => (
              <button
                key={item}
                onClick={() => setQuery(item)}
                className="rounded-full border border-white/10 bg-[#1f1f1f] px-3 py-1 text-xs text-neutral-300 transition-colors hover:text-white"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {!isNewConversation && (
          <FollowupBox value={query} onChange={setQuery} onSubmit={handleFollowupSubmit} disabled={isStreaming} />
        )}
      </div>
    </AppShell>
  );
}
