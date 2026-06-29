import { randomUUID } from "node:crypto";
import { demoStore } from "@/lib/demo-store";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { Hint, ProfileInput, Question, Review } from "@/lib/schemas";

export type SessionOwner = {
  sessionId: string;
  userId?: string | null;
};

export type RoundDetail = {
  id: string;
  sessionId: string;
  userId?: string | null;
  question: Question;
  questionNumber: number;
  hintHistory: Hint[];
  currentCode: string;
  status: string;
  createdAt: string;
};

export type RoundSummary = {
  id: string;
  questionNumber: number;
  title: string;
  difficulty: Question["difficulty"];
  status: string;
  createdAt: string;
};

const defaultCode = `def solve(events):
    # Talk through your approach as you code.
    pass
`;

export async function saveProfile(owner: SessionOwner, profile: ProfileInput) {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    demoStore.profiles.set(owner.sessionId, { sessionId: owner.sessionId, ...profile });
    return;
  }

  await throwOnError(
    supabase.from("sessions").upsert({
      id: owner.sessionId,
      updated_at: new Date().toISOString(),
    }),
  );

  const profileRecord = {
      session_id: owner.sessionId,
      user_id: owner.userId,
      resume_text: profile.resumeText,
      job_description: profile.jobDescription,
      company: profile.company,
      role: profile.role,
      updated_at: new Date().toISOString(),
    };

  await throwOnError(
    owner.userId
      ? supabase
          .from("profiles")
          .upsert(profileRecord, { onConflict: "user_id" })
      : supabase.from("profiles").upsert(profileRecord),
  );
}

export async function getProfile(owner: SessionOwner) {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    const profile = demoStore.profiles.get(owner.sessionId);
    return profile ? stripSession(profile) : null;
  }

  let query = supabase
    .from("profiles")
    .select("resume_text, job_description, company, role")
    .limit(1);

  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("session_id", owner.sessionId);

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    resumeText: data.resume_text,
    jobDescription: data.job_description,
    company: data.company,
    role: data.role,
  };
}

export async function getPreviousQuestionTitles(owner: SessionOwner) {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    return [...demoStore.rounds.values()]
      .filter((round) => matchesOwner(round, owner))
      .map((round) => round.question.title);
  }

  let query = supabase
    .from("coding_rounds")
    .select("question")
    .order("question_number", { ascending: true });

  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("session_id", owner.sessionId);

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((round) => round.question?.title).filter(Boolean);
}

export async function saveQuestion(
  owner: SessionOwner,
  question: Question,
  questionNumber: number,
) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    demoStore.rounds.set(id, {
      id,
      sessionId: owner.sessionId,
      userId: owner.userId,
      question,
      questionNumber,
      hintHistory: [],
      currentCode: defaultCode,
      status: "active",
      createdAt,
    });
    return {
      id,
      question,
      questionNumber,
      hintHistory: [],
      currentCode: defaultCode,
      status: "active",
      createdAt,
    };
  }

  await throwOnError(
    insertCodingRound(supabase, {
      id,
      session_id: owner.sessionId,
      user_id: owner.userId,
      question,
      question_number: questionNumber,
      language: "python",
      status: "active",
      current_code: defaultCode,
    }),
  );

  return {
    id,
    question,
    questionNumber,
    hintHistory: [],
    currentCode: defaultCode,
    status: "active",
    createdAt,
  };
}

export async function getLatestRound(owner: SessionOwner) {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    return [...demoStore.rounds.values()]
      .filter((round) => matchesOwner(round, owner))
      .sort((a, b) => b.questionNumber - a.questionNumber)[0] ?? null;
  }

  const { data, error } = await selectRound(supabase, owner);

  if (error || !data) {
    return null;
  }

  return mapRound(data as unknown as Parameters<typeof mapRound>[0]);
}

export async function getRoundHistory(owner: SessionOwner): Promise<RoundSummary[]> {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    return [...demoStore.rounds.values()]
      .filter((round) => matchesOwner(round, owner))
      .sort((a, b) => b.questionNumber - a.questionNumber)
      .map((round) => ({
        id: round.id,
        questionNumber: round.questionNumber,
        title: round.question.title,
        difficulty: round.question.difficulty,
        status: round.status,
        createdAt: round.createdAt,
      }));
  }

  let query = supabase
    .from("coding_rounds")
    .select("id, question, question_number, status, created_at")
    .order("question_number", { ascending: false });

  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("session_id", owner.sessionId);

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map((round) => ({
    id: round.id,
    questionNumber: round.question_number,
    title: round.question?.title ?? "Untitled question",
    difficulty: round.question?.difficulty ?? "medium",
    status: round.status,
    createdAt: round.created_at,
  }));
}

export async function getRoundById(owner: SessionOwner, roundId: string) {
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    const round = demoStore.rounds.get(roundId);
    return round && matchesOwner(round, owner) ? round : null;
  }

  const { data, error } = await selectRound(supabase, owner, roundId);
  if (error || !data) {
    return null;
  }

  return mapRound(data as unknown as Parameters<typeof mapRound>[0]);
}

export async function updateRoundCode(
  owner: SessionOwner,
  roundId: string,
  code: string,
) {
  const round = await getRoundById(owner, roundId);
  if (!round) {
    throw new Error("Round not found.");
  }

  const supabase = createSupabaseAdmin();

  if (!supabase) {
    demoStore.rounds.set(roundId, { ...round, currentCode: code });
    return;
  }

  const { error } = await supabase
    .from("coding_rounds")
    .update({ current_code: code })
    .eq("id", roundId)
    .eq(owner.userId ? "user_id" : "session_id", owner.userId ?? owner.sessionId);

  if (isMissingColumnError(error, "current_code")) {
    return;
  }

  if (error) {
    throw new Error(error.message);
  }
}

export async function appendHint(owner: SessionOwner, roundId: string, hint: Hint) {
  const round = await getRoundById(owner, roundId);
  if (!round) {
    throw new Error("Round not found.");
  }

  const nextHistory = [...round.hintHistory, hint];
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    demoStore.rounds.set(roundId, { ...round, hintHistory: nextHistory });
    return nextHistory;
  }

  await throwOnError(
    supabase
      .from("coding_rounds")
      .update({ hint_history: nextHistory })
      .eq("id", roundId)
      .eq(owner.userId ? "user_id" : "session_id", owner.userId ?? owner.sessionId),
  );

  return nextHistory;
}

export async function saveSubmission(
  owner: SessionOwner,
  roundId: string,
  code: string,
  review: Review,
) {
  const id = randomUUID();
  const supabase = createSupabaseAdmin();

  if (!supabase) {
    const existing = demoStore.submissions.get(roundId) ?? [];
    demoStore.submissions.set(roundId, [
      ...existing,
      { id, roundId, sessionId: owner.sessionId, userId: owner.userId, code, review },
    ]);
    const round = demoStore.rounds.get(roundId);
    if (round) {
      demoStore.rounds.set(roundId, {
        ...round,
        currentCode: code,
        status: "reviewed",
      });
    }
    return;
  }

  await throwOnError(
    supabase.from("coding_submissions").insert({
      id,
      round_id: roundId,
      session_id: owner.sessionId,
      user_id: owner.userId,
      code,
      review,
    }),
  );

  const reviewUpdate = await supabase
    .from("coding_rounds")
    .update({ status: "reviewed", current_code: code })
    .eq("id", roundId)
    .eq(owner.userId ? "user_id" : "session_id", owner.userId ?? owner.sessionId);

  if (isMissingColumnError(reviewUpdate.error, "current_code")) {
    await throwOnError(
      supabase
        .from("coding_rounds")
        .update({ status: "reviewed" })
        .eq("id", roundId)
        .eq(
          owner.userId ? "user_id" : "session_id",
          owner.userId ?? owner.sessionId,
        ),
    );
    return;
  }

  await throwOnError(Promise.resolve(reviewUpdate));
}

async function insertCodingRound(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  record: {
    id: string;
    session_id: string;
    user_id?: string | null;
    question: Question;
    question_number: number;
    language: string;
    status: string;
    current_code: string;
  },
) {
  const result = await supabase.from("coding_rounds").insert(record);

  if (isMissingColumnError(result.error, "current_code")) {
    const compatibleRecord = {
      id: record.id,
      session_id: record.session_id,
      user_id: record.user_id,
      question: record.question,
      question_number: record.question_number,
      language: record.language,
      status: record.status,
    };
    return supabase.from("coding_rounds").insert(compatibleRecord);
  }

  return result;
}

async function selectRound(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  owner: SessionOwner,
  roundId?: string,
) {
  const withCurrentCode = await buildRoundQuery(
    supabase,
    owner,
    roundId,
    true,
  ).maybeSingle();

  if (isMissingColumnError(withCurrentCode.error, "current_code")) {
    return buildRoundQuery(supabase, owner, roundId, false).maybeSingle();
  }

  return withCurrentCode;
}

function buildRoundQuery(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdmin>>,
  owner: SessionOwner,
  roundId: string | undefined,
  includeCurrentCode: boolean,
) {
  const selectColumns = includeCurrentCode
    ? "id, session_id, user_id, question, question_number, hint_history, current_code, status, created_at"
    : "id, session_id, user_id, question, question_number, hint_history, status, created_at";

  let query = supabase
    .from("coding_rounds")
    .select(selectColumns)
    .order("question_number", { ascending: false })
    .limit(1);

  if (roundId) {
    query = query.eq("id", roundId);
  }

  return owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("session_id", owner.sessionId);
}

function isMissingColumnError(
  error: { message?: string; code?: string } | Error | null,
  column: string,
) {
  return Boolean(
    error?.message?.includes(`'${column}' column`) ||
      error?.message?.includes(`column "${column}"`) ||
      error?.message?.includes(`.${column}`) ||
      error?.message?.includes(`Could not find the '${column}' column`),
  );
}

function matchesOwner(
  record: { sessionId: string; userId?: string | null },
  owner: SessionOwner,
) {
  return owner.userId
    ? record.userId === owner.userId || record.sessionId === owner.sessionId
    : record.sessionId === owner.sessionId;
}

function mapRound(data: {
  id: string;
  session_id: string;
  user_id?: string | null;
  question: Question;
  question_number: number;
  hint_history?: Hint[] | null;
  current_code?: string | null;
  status?: string | null;
  created_at?: string | null;
}): RoundDetail {
  return {
    id: data.id,
    sessionId: data.session_id,
    userId: data.user_id,
    question: data.question as Question,
    questionNumber: data.question_number,
    hintHistory: (data.hint_history ?? []) as Hint[],
    currentCode: data.current_code ?? defaultCode,
    status: data.status ?? "active",
    createdAt: data.created_at ?? new Date().toISOString(),
  };
}

function stripSession(record: ProfileInput & { sessionId: string }) {
  const profile = {
    resumeText: record.resumeText,
    jobDescription: record.jobDescription,
    company: record.company,
    role: record.role,
  };
  return profile;
}

async function throwOnError<T>(
  query: PromiseLike<{ error: { message?: string } | Error | null; data?: T }>,
) {
  const { error } = await query;
  if (error) {
    throw new Error(error.message ?? "Database request failed.");
  }
}
