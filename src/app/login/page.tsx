import { redirect } from "next/navigation";
import { BriefcaseBusiness, FileText } from "lucide-react";
import { LoginForm } from "@/app/login/login-form";
import { hasSupabaseAuthConfig } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);

  if (hasSupabaseAuthConfig()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/");
    }
  }

  return (
    <main className="min-h-screen">
      <section className="border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Interview Prep</p>
            <h1 className="text-2xl font-semibold">Sign in</h1>
          </div>
          <div className="hidden items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)] sm:flex">
            <BriefcaseBusiness size={18} />
            Magic link access
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="space-y-5">
          <div>
            <h2 className="text-4xl font-semibold leading-tight">
              Sign in to continue your interview prep.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              Enter your email and we will send a secure one-time link. After it
              opens, you will land on the coding round setup page.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 text-sm">
            <FileText className="mt-0.5 text-[var(--accent)]" size={18} />
            <p>No password is required for this first version.</p>
          </div>
        </aside>

        {hasSupabaseAuthConfig() ? (
          <LoginForm initialError={params.error} nextPath={nextPath} />
        ) : (
          <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-[var(--danger)]">
            Supabase auth is not configured. Add
            NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your
            environment.
          </div>
        )}
      </section>
    </main>
  );
}

function sanitizeNextPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}
