import { supabase } from "@/lib/client";

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt?: string;
  created_at?: string;
};

export async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function fetchConversations() {
  const token = await getAuthToken();
  if (!token) return [];

  const response = await fetch(`${process.env.BUN_PUBLIC_API_URL}/conversations`, {
    headers: { Authorization: token },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch conversations.");
  }

  const payload = (await response.json()) as { conversations?: ConversationSummary[] };
  return payload.conversations ?? [];
}
