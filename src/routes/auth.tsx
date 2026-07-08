import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function safeNext(next: unknown): string {
  if (typeof next !== "string") return "/";
  // Only allow same-origin relative paths
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: safeNext(s.next),
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace(next);
    });
  }, [next]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const returnUrl = window.location.origin + next;
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: returnUrl },
          });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    window.location.replace(next);
  }

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    const returnUrl = window.location.origin + next;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: returnUrl },
    });
    if (error) {
      setBusy(false);
      setError(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-lg p-6 shadow-lg space-y-4">
        <h1 className="text-xl font-semibold">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full bg-white text-slate-900 rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          Continue with Google
        </button>
        <div className="text-center text-xs text-slate-400">or</div>
        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-500 rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-xs text-slate-400 hover:text-slate-200"
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
