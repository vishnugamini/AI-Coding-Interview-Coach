import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  extractResumeText: vi.fn(),
  getOrCreateSessionId: vi.fn(),
  getSessionId: vi.fn(),
  getOrCreateSessionOwner: vi.fn(),
  getSessionOwner: vi.fn(),
  saveProfile: vi.fn(),
  getProfile: vi.fn(),
  getPreviousQuestionTitles: vi.fn(),
  saveQuestion: vi.fn(),
  getLatestRound: vi.fn(),
  getRoundHistory: vi.fn(),
  getRoundById: vi.fn(),
  updateRoundCode: vi.fn(),
  appendHint: vi.fn(),
  saveSubmission: vi.fn(),
  generateCodingQuestion: vi.fn(),
  generateHint: vi.fn(),
  reviewSubmission: vi.fn(),
}));

vi.mock("@/lib/resume", () => ({
  extractResumeText: mocks.extractResumeText,
}));

vi.mock("@/lib/session", () => ({
  getOrCreateSessionId: mocks.getOrCreateSessionId,
  getSessionId: mocks.getSessionId,
  getOrCreateSessionOwner: mocks.getOrCreateSessionOwner,
  getSessionOwner: mocks.getSessionOwner,
}));

vi.mock("@/lib/data", () => ({
  saveProfile: mocks.saveProfile,
  getProfile: mocks.getProfile,
  getPreviousQuestionTitles: mocks.getPreviousQuestionTitles,
  saveQuestion: mocks.saveQuestion,
  getLatestRound: mocks.getLatestRound,
  getRoundHistory: mocks.getRoundHistory,
  getRoundById: mocks.getRoundById,
  updateRoundCode: mocks.updateRoundCode,
  appendHint: mocks.appendHint,
  saveSubmission: mocks.saveSubmission,
}));

vi.mock("@/lib/openai", () => ({
  generateCodingQuestion: mocks.generateCodingQuestion,
  generateHint: mocks.generateHint,
  reviewSubmission: mocks.reviewSubmission,
}));

const question = {
  title: "Sessionized Login Events",
  difficulty: "medium",
  prompt: "Group events into sessions.",
  constraints: ["Use Python."],
  examples: [],
  followUps: [],
  companyRelevance: "Common interview pattern.",
  citations: [],
};

const hint = {
  hintLevel: 1,
  nudge: "Track the current session boundary.",
  conceptsToReview: ["arrays"],
};

const review = {
  overallScore: 8,
  correctnessScore: 8,
  complexityScore: 8,
  codeQualityScore: 8,
  edgeCaseScore: 7,
  strengths: ["Single pass"],
  issues: ["Discuss empty input"],
  suggestedNextSteps: ["State complexity"],
  interviewerVerdict: "Strong attempt.",
};

describe("API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("saves an extracted profile", async () => {
    const { POST } = await import("@/app/api/profile/route");
    const owner = { sessionId: "session-1", userId: "user-1" };
    mocks.extractResumeText.mockResolvedValue(
      "Python engineer with backend systems experience.",
    );
    mocks.getOrCreateSessionOwner.mockResolvedValue(owner);

    const formData = new FormData();
    formData.set("company", "OpenAI");
    formData.set("role", "Software Engineer");
    formData.set(
      "jobDescription",
      "Build reliable product systems with Python and strong communication.",
    );
    formData.set("resumeText", "Pasted resume");

    const response = await POST(
      new Request("http://localhost/api/profile", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.saveProfile).toHaveBeenCalledWith(owner, {
      resumeText: "Python engineer with backend systems experience.",
      jobDescription:
        "Build reliable product systems with Python and strong communication.",
      company: "OpenAI",
      role: "Software Engineer",
    });
  });

  it("returns a saved profile", async () => {
    const { GET } = await import("@/app/api/profile/route");
    const owner = { sessionId: "session-1", userId: "user-1" };
    mocks.getSessionOwner.mockResolvedValue(owner);
    mocks.getProfile.mockResolvedValue({
      resumeText: "Python engineer with backend systems experience.",
      jobDescription: "Build reliable systems with Python.",
      company: "OpenAI",
      role: "Software Engineer",
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.profile.company).toBe("OpenAI");
    expect(mocks.getProfile).toHaveBeenCalledWith(owner);
  });

  it("generates and stores a coding question", async () => {
    const { POST } = await import("@/app/api/coding/question/route");
    const owner = { sessionId: "session-1", userId: "user-1" };
    mocks.getSessionOwner.mockResolvedValue(owner);
    mocks.getProfile.mockResolvedValue({
      resumeText: "Python engineer with backend systems experience.",
      jobDescription: "Build reliable systems with Python.",
      company: "OpenAI",
      role: "Software Engineer",
    });
    mocks.getPreviousQuestionTitles.mockResolvedValue([]);
    mocks.generateCodingQuestion.mockResolvedValue(question);
    mocks.saveQuestion.mockResolvedValue({
      id: "round-1",
      question,
      questionNumber: 1,
    });

    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.round.questionNumber).toBe(1);
    expect(mocks.generateCodingQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ company: "OpenAI" }),
      1,
      [],
    );
    expect(mocks.saveQuestion).toHaveBeenCalledWith(owner, question, 1);
  });

  it("returns coding round history", async () => {
    const { GET } = await import("@/app/api/coding/rounds/route");
    const owner = { sessionId: "session-1", userId: "user-1" };
    mocks.getSessionOwner.mockResolvedValue(owner);
    mocks.getRoundHistory.mockResolvedValue([
      {
        id: "round-1",
        questionNumber: 1,
        title: "Sessionized Login Events",
        difficulty: "medium",
        status: "active",
        createdAt: "2026-06-24T00:00:00.000Z",
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.rounds).toHaveLength(1);
    expect(mocks.getRoundHistory).toHaveBeenCalledWith(owner);
  });

  it("returns a saved coding round", async () => {
    const { GET } = await import("@/app/api/coding/rounds/[roundId]/route");
    const owner = { sessionId: "session-1", userId: "user-1" };
    mocks.getSessionOwner.mockResolvedValue(owner);
    mocks.getRoundById.mockResolvedValue({
      id: "round-1",
      sessionId: "session-1",
      userId: "user-1",
      question,
      questionNumber: 1,
      hintHistory: [],
      currentCode: "def solve(): pass",
      status: "active",
      createdAt: "2026-06-24T00:00:00.000Z",
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ roundId: "round-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.round.currentCode).toBe("def solve(): pass");
    expect(mocks.getRoundById).toHaveBeenCalledWith(owner, "round-1");
  });

  it("updates a saved coding draft", async () => {
    const { PATCH } = await import("@/app/api/coding/rounds/[roundId]/route");
    const owner = { sessionId: "session-1", userId: "user-1" };
    mocks.getSessionOwner.mockResolvedValue(owner);

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ code: "def solve(): pass" }),
      }),
      { params: Promise.resolve({ roundId: "round-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.updateRoundCode).toHaveBeenCalledWith(
      owner,
      "round-1",
      "def solve(): pass",
    );
  });

  it("generates a hint for the active round", async () => {
    const { POST } = await import("@/app/api/coding/hint/route");
    const owner = { sessionId: "session-1", userId: "user-1" };
    mocks.getSessionOwner.mockResolvedValue(owner);
    mocks.getRoundById.mockResolvedValue({
      id: "round-1",
      sessionId: "session-1",
      userId: "user-1",
      question,
      questionNumber: 1,
      hintHistory: [],
      currentCode: "",
      status: "active",
      createdAt: "2026-06-24T00:00:00.000Z",
    });
    mocks.generateHint.mockResolvedValue(hint);
    mocks.appendHint.mockResolvedValue([hint]);

    const response = await POST(
      new Request("http://localhost/api/coding/hint", {
        method: "POST",
        body: JSON.stringify({ roundId: "round-1", code: "def solve(): pass" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.hint.nudge).toBe("Track the current session boundary.");
    expect(mocks.appendHint).toHaveBeenCalledWith(owner, "round-1", hint);
  });

  it("reviews and stores a coding submission", async () => {
    const { POST } = await import("@/app/api/coding/review/route");
    const owner = { sessionId: "session-1", userId: "user-1" };
    mocks.getSessionOwner.mockResolvedValue(owner);
    mocks.getRoundById.mockResolvedValue({
      id: "round-1",
      sessionId: "session-1",
      userId: "user-1",
      question,
      questionNumber: 1,
      hintHistory: [],
      currentCode: "",
      status: "active",
      createdAt: "2026-06-24T00:00:00.000Z",
    });
    mocks.reviewSubmission.mockResolvedValue(review);

    const response = await POST(
      new Request("http://localhost/api/coding/review", {
        method: "POST",
        body: JSON.stringify({
          roundId: "round-1",
          code: "def solve(events):\n    return []",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.review.overallScore).toBe(8);
    expect(mocks.saveSubmission).toHaveBeenCalledWith(
      owner,
      "round-1",
      "def solve(events):\n    return []",
      review,
    );
  });
});
