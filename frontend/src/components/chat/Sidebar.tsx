import { ChevronDown, MessageSquare, Plus, Search } from "lucide-react";
import { supabase } from "@/lib/client";
import { fetchConversations, type ConversationSummary } from "@/lib/api";
import { useEffect, useState } from "react";
import { type User } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router";

type PrimaryItem = {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
  active?: boolean;
};

export default function Sidebar() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    }
    fetchUser();
  }, []);

  useEffect(() => {
    async function loadConversations() {
      try {
        const rows = await fetchConversations();
        setConversations(rows);
      } catch {
        setConversations([]);
      }
    }
    loadConversations();
  }, []);

  const primaryItems: PrimaryItem[] = [
    {
      label: "New",
      icon: Plus,
      onClick: () => navigate("/"),
      active: location.pathname === "/",
    },
    {
      label: "History",
      icon: Search,
      onClick: () => navigate("/history"),
      active: location.pathname === "/history",
    },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/10 bg-[#151516] text-neutral-200">
      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-1">
          {primaryItems.map(({ label, icon: Icon, onClick, active }) => (
            <button
              key={label}
              onClick={onClick}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-neutral-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-5 text-xs uppercase tracking-wide text-neutral-500">Recent chats</div>
        <div className="mt-2 space-y-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => navigate(`/conversations/${conversation.id}`)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-neutral-400 transition-colors hover:bg-white/10 hover:text-neutral-200"
              title={conversation.title}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{conversation.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <button className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-xs font-semibold text-white">
            {(user?.email?.[0] ?? "U").toUpperCase()}
          </span>
          <span className="ml-2 mr-auto truncate text-sm">{user?.email ?? "Guest"}</span>
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        </button>
      </div>
    </aside>
  );
}
