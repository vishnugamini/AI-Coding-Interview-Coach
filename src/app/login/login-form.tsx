"use client";

import { FormEvent, useMemo, useState } from "react";
import { Mail, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type LoginFormProps = {
  initialError?: string;
  nextPath?: string;
};

export function LoginForm({ initialError = "", nextPath = "/" }: LoginFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [error, setError] = useState(initialError);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSent(false);
    setLoading(true);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", nextPath);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setSent(true);
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm"
    >
      <label className="grid gap-2 text-sm font-medium">
        Email
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            size={18}
          />
          <input
            autoComplete="email"
            className="focus-ring w-full rounded-md border border-[var(--line)] px-10 py-3 font-normal"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </div>
      </label>

      {sent ? (
        <p className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-sm">
          Check your email for a sign-in link. You can close this tab after the
          link opens.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button
        disabled={loading}
        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 py-3 font-semibold text-white hover:bg-[var(--accent-strong)]"
        type="submit"
      >
        {loading ? "Sending link..." : "Send magic link"}
        <Send size={18} />
      </button>
    </form>
  );
}
