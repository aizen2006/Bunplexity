import { Button } from "@/components/ui/button";
import AppShell from "../components/chat/AppShell";
import RandQuery from "../components/chat/RandQuery";
import { supabase } from "@/lib/client";
import { type User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import ChatBox from "@/components/chat/ChatBox";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    }
    fetchUser();
  }, []);

  return (
    <AppShell>
      <div className="flex min-h-screen flex-col px-6 py-8">
        {!user && (
          <div className="mx-auto mt-16 w-full max-w-3xl">
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        )}

        {user && (
          <div className="mx-auto mt-8 w-full max-w-4xl">
            <div className="mb-10 flex items-center justify-end gap-3">
              <span className="text-sm text-neutral-400">{user.email}</span>
              <Button variant="outline" onClick={() => supabase.auth.signOut()}>
                Logout
              </Button>
            </div>

            <div className="mx-auto max-w-3xl pt-8 text-center">
              <h1 className="text-5xl font-semibold tracking-tight text-neutral-200">perplexity</h1>
              <div className="mt-8">
                <ChatBox />
              </div>
              <RandQuery />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}