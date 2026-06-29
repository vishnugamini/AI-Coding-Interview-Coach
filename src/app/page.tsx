"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  LogOut,
  Upload,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save profile.");
      }

      router.push("/coding");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save profile.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <section className="border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Interview Prep</p>
            <h1 className="text-2xl font-semibold">Coding round setup</h1>
          </div>
          <div className="hidden items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)] sm:flex">
            <BriefcaseBusiness size={18} />
            Python practice only
          </div>
          <form action="/auth/sign-out" method="post">
            <button
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:bg-[var(--panel-strong)]"
              type="submit"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-5">
          <div>
            <h2 className="text-4xl font-semibold leading-tight">
              Practice the screen you are actually walking into.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              Add your resume, target role, company, and job description. The
              coding round will generate one focused Python prompt at a time and
              review your answer like an interviewer.
            </p>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
              <FileText className="mt-0.5 text-[var(--accent)]" size={18} />
              <p>Resume and job context are used to tune question selection.</p>
            </div>
            <div className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
              <Upload className="mt-0.5 text-[var(--accent)]" size={18} />
              <p>Upload PDF, DOCX, TXT, or paste your resume text directly.</p>
            </div>
          </div>
        </aside>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-md border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Company
              <input
                className="focus-ring rounded-md border border-[var(--line)] px-3 py-2 font-normal"
                name="company"
                placeholder="OpenAI"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Role
              <input
                className="focus-ring rounded-md border border-[var(--line)] px-3 py-2 font-normal"
                name="role"
                placeholder="Software Engineer"
                required
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Resume upload
            <input
              className="focus-ring rounded-md border border-dashed border-[var(--line)] bg-[var(--panel-strong)] px-3 py-3 font-normal"
              name="resumeFile"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Or paste resume text
            <textarea
              className="focus-ring min-h-36 resize-y rounded-md border border-[var(--line)] px-3 py-2 font-normal leading-6"
              name="resumeText"
              placeholder="Paste your resume text here if you do not upload a file."
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Job description
            <textarea
              className="focus-ring min-h-44 resize-y rounded-md border border-[var(--line)] px-3 py-2 font-normal leading-6"
              name="jobDescription"
              placeholder="Paste the job description, recruiter notes, or role requirements."
              required
            />
          </label>

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
            {loading ? "Preparing..." : "Start coding round"}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
