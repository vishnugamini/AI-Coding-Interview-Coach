import type { Hint, ProfileInput, Question, Review } from "@/lib/schemas";

type ProfileRecord = ProfileInput & {
  sessionId: string;
};

type RoundRecord = {
  id: string;
  sessionId: string;
  userId?: string | null;
  questionNumber: number;
  question: Question;
  hintHistory: Hint[];
  currentCode: string;
  status: string;
  createdAt: string;
};

type SubmissionRecord = {
  id: string;
  roundId: string;
  sessionId: string;
  userId?: string | null;
  code: string;
  review: Review;
};

export const demoStore = {
  profiles: new Map<string, ProfileRecord>(),
  rounds: new Map<string, RoundRecord>(),
  submissions: new Map<string, SubmissionRecord[]>(),
};
