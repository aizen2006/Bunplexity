import { Button } from "@/components/ui/button";
import { type Provider } from "@supabase/supabase-js";
import { supabase } from "@/lib/client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

export default function Auth() {
  const navigate = useNavigate();
  const [isExchanging, setIsExchanging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasExchangedRef = useRef(false);

  const clearOAuthQuery = () => {
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());
  };

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");

    if (!code) return;
    if (hasExchangedRef.current) return;

    hasExchangedRef.current = true;
    setIsExchanging(true);
    setErrorMessage(null);

    (async () => {
      try {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.session) {
          throw error ?? new Error("OAuth session exchange failed.");
        }

        clearOAuthQuery();
        navigate("/", { replace: true });
      } catch (err) {
        console.error("OAuth exchange failed", err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "OAuth exchange failed."
        );

        clearOAuthQuery();
      } finally {
        setIsExchanging(false);
      }
    })();
  }, [navigate]);

  const login = async (provider: Provider) => {
    try {
      setErrorMessage(null);
      setIsExchanging(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("OAuth login failed", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "OAuth login failed."
      );
    } finally {
      setIsExchanging(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] p-6 text-neutral-100">
      <div className="flex min-h-[calc(100vh-3rem)] overflow-hidden rounded-4xl border border-white/70">
        <div className="hidden flex-1 border-r border-white/50 md:block" />

        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-[220px] rounded-3xl border border-white/70 bg-[#151516]/40 p-8">
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => login("github")}
                disabled={isExchanging}
                variant="outline"
              >
                {isExchanging ? "Please wait..." : "GitHub"}
              </Button>

              <Button
                className="w-full"
                onClick={() => login("google")}
                disabled={isExchanging}
                variant="outline"
              >
                {isExchanging ? "Please wait..." : "Google"}
              </Button>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}