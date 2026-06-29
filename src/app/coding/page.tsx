"use client";

import Editor from "@monaco-editor/react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  History,
  Lightbulb,
  Loader2,
  LogOut,
  Play,
  Save,
  Send,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Hint, ProfileInput, Question, Review } from "@/lib/schemas";

type Round = {
  id: string;
  question: Question;
  questionNumber: number;
  hintHistory: Hint[];
  currentCode: string;
  status: string;
  createdAt: string;
};

type RoundSummary = {
  id: string;
  questionNumber: number;
  title: string;
  difficulty: Question["difficulty"];
  status: string;
  createdAt: string;
};

const starterCode = `def solve(events):
    # Talk through your approach as you code.
    pass
`;

const emptyProfile: ProfileInput = {
  resumeText: "",
  jobDescription: "",
  company: "",
  role: "",
};

export default function CodingPage() {
  const [profile, setProfile] = useState<ProfileInput>(emptyProfile);
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [code, setCode] = useState(starterCode);
  const [hints, setHints] = useState<Hint[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingRoundId, setLoadingRoundId] = useState("");
  const [loadingHint, setLoadingHint] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lastSavedCode = useRef(starterCode);

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!round || code === lastSavedCode.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveCodeDraft(round.id, code);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [code, round]);

  const scoreRows = useMemo(() => {
    if (!review) return [];
    return [
      ["Overall", review.overallScore],
      ["Correctness", review.correctnessScore],
      ["Complexity", review.complexityScore],
      ["Code quality", review.codeQualityScore],
      ["Edge cases", review.edgeCaseScore],
    ];
  }, [review]);

  async function loadWorkspace() {
    setError("");
    setLoadingPage(true);

    try {
      const [profileResponse, roundsResponse] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/coding/rounds"),
      ]);

      if (profileResponse.ok) {
        const profilePayload = await profileResponse.json();
        setProfile(profilePayload.profile);
      } else {
        const profilePayload = await profileResponse.json();
        throw new Error(
          profilePayload.error || "Create your interview profile first.",
        );
      }

      if (roundsResponse.ok) {
        const roundsPayload = await roundsResponse.json();
        setRounds(roundsPayload.rounds);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load interview workspace.",
      );
    } finally {
      setLoadingPage(false);
    }
  }

  async function refreshHistory() {
    const response = await fetch("/api/coding/rounds");
    if (response.ok) {
      const payload = await response.json();
      setRounds(payload.rounds);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSavingProfile(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save profile.");
      }

      setNotice("Profile saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function startSolving() {
    setError("");
    setNotice("");
    setLoadingQuestion(true);
    setReview(null);

    try {
      const response = await fetch("/api/coding/question", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load question.");
      }

      openRound(payload.round);
      await refreshHistory();
    } catch (questionError) {
      setError(
        questionError instanceof Error
          ? questionError.message
          : "Unable to load question.",
      );
    } finally {
      setLoadingQuestion(false);
    }
  }

  async function loadRound(roundId: string) {
    setError("");
    setNotice("");
    setLoadingRoundId(roundId);
    setReview(null);

    try {
      const response = await fetch(`/api/coding/rounds/${roundId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load question.");
      }

      openRound(payload.round);
    } catch (roundError) {
      setError(
        roundError instanceof Error ? roundError.message : "Unable to load question.",
      );
    } finally {
      setLoadingRoundId("");
    }
  }

  function openRound(nextRound: Round) {
    const nextCode = nextRound.currentCode || starterCode;
    setRound(nextRound);
    setHints(nextRound.hintHistory ?? []);
    setCode(nextCode);
    lastSavedCode.current = nextCode;
  }

  async function saveCodeDraft(roundId: string, nextCode: string) {
    const response = await fetch(`/api/coding/rounds/${roundId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: nextCode }),
    });

    if (response.ok) {
      lastSavedCode.current = nextCode;
    }
  }

  async function requestHint() {
    if (!round) return;
    setError("");
    setLoadingHint(true);

    try {
      const response = await fetch("/api/coding/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.id, code }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate hint.");
      }

      setHints(payload.hintHistory);
    } catch (hintError) {
      setError(
        hintError instanceof Error
          ? hintError.message
          : "Unable to generate hint.",
      );
    } finally {
      setLoadingHint(false);
    }
  }

  async function submitReview() {
    if (!round) return;
    setError("");
    setLoadingReview(true);

    try {
      await saveCodeDraft(round.id, code);
      const response = await fetch("/api/coding/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.id, code }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to review submission.");
      }

      setReview(payload.review);
      await refreshHistory();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to review submission.",
      );
    } finally {
      setLoadingReview(false);
    }
  }

  if (loadingPage) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <Loader2 className="animate-spin" size={18} />
          Loading interview workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Interview Prep</p>
            <h1 className="text-2xl font-semibold">
              {round ? `Question ${round.questionNumber}` : "Review your setup"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm">
              <Bot size={18} className="text-[var(--accent)]" />
              LLM interviewer review
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
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-4 xl:grid-cols-[280px_1fr]">
        <HistoryPanel
          activeRoundId={round?.id ?? ""}
          loadingRoundId={loadingRoundId}
          onSelect={loadRound}
          rounds={rounds}
        />

        <div className="space-y-4">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          {notice ? (
            <p className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-sm">
              {notice}
            </p>
          ) : null}

          {!round ? (
            <ProfileReview
              loadingQuestion={loadingQuestion}
              onProfileChange={setProfile}
              onSave={saveProfile}
              onStart={startSolving}
              profile={profile}
              savingProfile={savingProfile}
            />
          ) : (
            <SolvingWorkspace
              code={code}
              hints={hints}
              loadingHint={loadingHint}
              loadingQuestion={loadingQuestion}
              loadingReview={loadingReview}
              onCodeChange={setCode}
              onHint={requestHint}
              onNextQuestion={startSolving}
              onReview={submitReview}
              review={review}
              round={round}
              scoreRows={scoreRows}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function HistoryPanel({
  activeRoundId,
  loadingRoundId,
  onSelect,
  rounds,
}: {
  activeRoundId: string;
  loadingRoundId: string;
  onSelect: (roundId: string) => void;
  rounds: RoundSummary[];
}) {
  return (
    <aside className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3">
      <div className="mb-3 flex items-center gap-2">
        <History size={18} className="text-[var(--accent)]" />
        <h2 className="font-semibold">History</h2>
      </div>

      {rounds.length ? (
        <div className="space-y-2">
          {rounds.map((historyRound) => {
            const active = historyRound.id === activeRoundId;
            return (
              <button
                className={`focus-ring w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-[var(--panel-strong)] ${
                  active
                    ? "border-[var(--accent)] bg-[var(--panel-strong)]"
                    : "border-[var(--line)]"
                }`}
                key={historyRound.id}
                onClick={() => onSelect(historyRound.id)}
                type="button"
              >
                <span className="block font-semibold">
                  {loadingRoundId === historyRound.id
                    ? "Loading..."
                    : `Question ${historyRound.questionNumber}`}
                </span>
                <span className="mt-1 block leading-5 text-[var(--muted)]">
                  {historyRound.title}
                </span>
                <span className="mt-2 inline-flex rounded-md bg-[var(--panel-strong)] px-2 py-1 text-xs uppercase text-[var(--accent)]">
                  {historyRound.status}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm leading-6 text-[var(--muted)]">
          Questions you start will appear here.
        </p>
      )}
    </aside>
  );
}

function ProfileReview({
  loadingQuestion,
  onProfileChange,
  onSave,
  onStart,
  profile,
  savingProfile,
}: {
  loadingQuestion: boolean;
  onProfileChange: (profile: ProfileInput) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onStart: () => void;
  profile: ProfileInput;
  savingProfile: boolean;
}) {
  function updateField(field: keyof ProfileInput, value: string) {
    onProfileChange({ ...profile, [field]: value });
  }

  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">Saved details</p>
          <h2 className="text-2xl font-semibold">Review before solving</h2>
        </div>
        <div className="grid gap-2">
          <button
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 py-3 font-semibold text-white hover:bg-[var(--accent-strong)]"
            disabled={loadingQuestion || savingProfile}
            onClick={onStart}
            type="button"
          >
            {loadingQuestion ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Play size={18} />
            )}
            {loadingQuestion ? "Generating question..." : "Start solving"}
          </button>
          {loadingQuestion ? (
            <p className="text-xs text-[var(--muted)]">
              This can take a bit when web search is enabled.
            </p>
          ) : null}
        </div>
      </div>

      <form className="mt-5 space-y-5" onSubmit={onSave}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Company
            <input
              className="focus-ring rounded-md border border-[var(--line)] px-3 py-2 font-normal"
              name="company"
              onChange={(event) => updateField("company", event.target.value)}
              required
              value={profile.company}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Role
            <input
              className="focus-ring rounded-md border border-[var(--line)] px-3 py-2 font-normal"
              name="role"
              onChange={(event) => updateField("role", event.target.value)}
              required
              value={profile.role}
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Resume text
          <textarea
            className="focus-ring min-h-40 resize-y rounded-md border border-[var(--line)] px-3 py-2 font-normal leading-6"
            name="resumeText"
            onChange={(event) => updateField("resumeText", event.target.value)}
            required
            value={profile.resumeText}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Job description
          <textarea
            className="focus-ring min-h-44 resize-y rounded-md border border-[var(--line)] px-3 py-2 font-normal leading-6"
            name="jobDescription"
            onChange={(event) =>
              updateField("jobDescription", event.target.value)
            }
            required
            value={profile.jobDescription}
          />
        </label>

        <button
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-4 py-3 font-semibold hover:bg-[var(--panel-strong)]"
          disabled={savingProfile}
          type="submit"
        >
          {savingProfile ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          Save details
        </button>
      </form>
    </section>
  );
}

function SolvingWorkspace({
  code,
  hints,
  loadingHint,
  loadingQuestion,
  loadingReview,
  onCodeChange,
  onHint,
  onNextQuestion,
  onReview,
  review,
  round,
  scoreRows,
}: {
  code: string;
  hints: Hint[];
  loadingHint: boolean;
  loadingQuestion: boolean;
  loadingReview: boolean;
  onCodeChange: (code: string) => void;
  onHint: () => void;
  onNextQuestion: () => void;
  onReview: () => void;
  review: Review | null;
  round: Round;
  scoreRows: (string | number)[][];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <QuestionPanel question={round.question} />

        {hints.length > 0 ? (
          <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
            <h2 className="mb-3 text-lg font-semibold">Nudges</h2>
            <div className="space-y-3">
              {hints.map((hint, index) => (
                <div
                  className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)] p-3"
                  key={`${hint.hintLevel}-${index}`}
                >
                  <p className="text-sm font-semibold">Hint {hint.hintLevel}</p>
                  <p className="mt-1 leading-6">{hint.nudge}</p>
                  {hint.conceptsToReview.length ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Review: {hint.conceptsToReview.join(", ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="space-y-4">
        <section className="overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold">Python editor</h2>
              <p className="text-sm text-[var(--muted)]">
                Drafts are saved as you work.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:bg-[var(--panel-strong)]"
                disabled={loadingHint || loadingQuestion}
                onClick={onHint}
                type="button"
              >
                {loadingHint ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Lightbulb size={16} />
                )}
                Hint
              </button>
              <button
                className="focus-ring inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
                disabled={loadingReview || loadingQuestion}
                onClick={onReview}
                type="button"
              >
                {loadingReview ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Send size={16} />
                )}
                Submit
              </button>
            </div>
          </div>
          <div className="h-[520px]">
            <Editor
              defaultLanguage="python"
              language="python"
              onChange={(value) => onCodeChange(value ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbersMinChars: 3,
                padding: { top: 14 },
                scrollBeyondLastLine: false,
                wordWrap: "on",
              }}
              theme="vs-dark"
              value={code}
            />
          </div>
        </section>

        {review ? (
          <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Interviewer review</h2>
                <p className="mt-1 leading-6">{review.interviewerVerdict}</p>
              </div>
              <button
                className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold hover:bg-[var(--panel-strong)]"
                disabled={loadingQuestion}
                onClick={onNextQuestion}
                type="button"
              >
                Next question
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              {scoreRows.map(([label, score]) => (
                <div
                  className="rounded-md border border-[var(--line)] bg-[var(--panel-strong)] p-3"
                  key={label}
                >
                  <p className="text-xs text-[var(--muted)]">{label}</p>
                  <p className="text-2xl font-semibold">{score}/10</p>
                </div>
              ))}
            </div>

            <ReviewList title="Strengths" items={review.strengths} />
            <ReviewList title="Issues" items={review.issues} />
            <ReviewList
              title="Suggested next steps"
              items={review.suggestedNextSteps}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}

function QuestionPanel({ question }: { question: Question }) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[var(--panel-strong)] px-2 py-1 text-xs font-semibold uppercase text-[var(--accent)]">
          {question.difficulty}
        </span>
        <span className="inline-flex items-center gap-1 text-sm text-[var(--muted)]">
          <CheckCircle2 size={16} />
          Python
        </span>
      </div>
      <h2 className="mt-3 text-2xl font-semibold">{question.title}</h2>
      <p className="mt-3 whitespace-pre-wrap leading-7">{question.prompt}</p>

      <QuestionList title="Constraints" items={question.constraints} />
      <QuestionList title="Examples" items={question.examples} />
      <QuestionList title="Follow-ups" items={question.followUps} />

      <div className="mt-5 rounded-md border border-[var(--line)] bg-[var(--panel-strong)] p-3">
        <p className="text-sm font-semibold">Why this question</p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          {question.companyRelevance}
        </p>
      </div>

      {question.citations.length ? (
        <div className="mt-4">
          <p className="text-sm font-semibold">Sources</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {question.citations.map((citation) => (
              <a
                className="focus-ring rounded-md border border-[var(--line)] px-2 py-1 text-sm text-[var(--accent)] hover:bg-[var(--panel-strong)]"
                href={citation.url}
                key={citation.url}
                rel="noreferrer"
                target="_blank"
              >
                {citation.title}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function QuestionList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-5">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 leading-6 text-[var(--muted)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 leading-6 text-[var(--muted)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
