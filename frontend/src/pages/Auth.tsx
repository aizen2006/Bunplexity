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
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                if (error || !data.session) {
                    throw error ?? new Error("OAuth session exchange failed.");
                }
                navigate("/", { replace: true });
            } catch (err) {
                console.error("OAuth exchange failed", err);
                setErrorMessage(err instanceof Error ? err.message : "OAuth exchange failed.");
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
                options: { redirectTo: `${window.location.origin}/auth` },
            });
            if (error) throw error;
        } catch (error) {
            console.error("OAuth login failed", error);
            setErrorMessage(error instanceof Error ? error.message : "OAuth login failed.");
            throw error;
        } finally {
            setIsExchanging(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#101010] text-neutral-100">
            <div className="w-1/2 border-r border-white/10" />
            <div className="flex w-1/2 items-center justify-center p-8">
                <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151516] p-8 shadow-lg">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
                        <p className="mt-2 text-sm text-neutral-400">
                            Use GitHub or Google to continue.
                        </p>
                    </div>

                    <div className="mt-8 space-y-3">
                        <Button
                            className="w-full"
                            onClick={() => login("github")}
                            disabled={isExchanging}
                            variant="outline"
                        >
                            Continue with GitHub
                        </Button>
                        <Button
                            className="w-full"
                            onClick={() => login("google")}
                            disabled={isExchanging}
                            variant="outline"
                        >
                            Continue with Google
                        </Button>
                    </div>

                    {errorMessage && (
                        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {errorMessage}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}