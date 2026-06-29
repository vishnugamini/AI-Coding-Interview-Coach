import OpenAI from "openai";
import {
  HintSchema,
  QuestionSchema,
  ReviewSchema,
  type Hint,
  type ProfileInput,
  type Question,
  type Review,
} from "@/lib/schemas";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

const questionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "difficulty",
    "prompt",
    "constraints",
    "examples",
    "followUps",
    "companyRelevance",
    "citations",
  ],
  properties: {
    title: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    prompt: { type: "string" },
    constraints: { type: "array", items: { type: "string" } },
    examples: { type: "array", items: { type: "string" } },
    followUps: { type: "array", items: { type: "string" } },
    companyRelevance: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
        },
      },
    },
  },
} as const;

const hintJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hintLevel", "nudge", "conceptsToReview"],
  properties: {
    hintLevel: { type: "integer", minimum: 1, maximum: 5 },
    nudge: { type: "string" },
    conceptsToReview: { type: "array", items: { type: "string" } },
  },
} as const;

const reviewJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overallScore",
    "correctnessScore",
    "complexityScore",
    "codeQualityScore",
    "edgeCaseScore",
    "strengths",
    "issues",
    "suggestedNextSteps",
    "interviewerVerdict",
  ],
  properties: {
    overallScore: { type: "number", minimum: 0, maximum: 10 },
    correctnessScore: { type: "number", minimum: 0, maximum: 10 },
    complexityScore: { type: "number", minimum: 0, maximum: 10 },
    codeQualityScore: { type: "number", minimum: 0, maximum: 10 },
    edgeCaseScore: { type: "number", minimum: 0, maximum: 10 },
    strengths: { type: "array", items: { type: "string" } },
    issues: { type: "array", items: { type: "string" } },
    suggestedNextSteps: { type: "array", items: { type: "string" } },
    interviewerVerdict: { type: "string" },
  },
} as const;

function openaiClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateCodingQuestion(
  profile: ProfileInput,
  questionNumber: number,
  previousTitles: string[],
): Promise<Question> {
  const client = openaiClient();
  if (!client) {
    return demoQuestion(profile, questionNumber);
  }

  const response = await client.responses.create({
    model: MODEL,
    tools: [{ type: "web_search_preview" }],
    input: [
      {
        role: "system",
        content:
          "You are an expert coding interview coach. Generate one Python coding interview question at a time. Prefer repeated company-specific patterns discovered via web search, but do not copy paid or private content. Avoid questions already seen.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Generate the next Python coding interview question.",
          profile,
          questionNumber,
          previousTitles,
          requirements: [
            "One question only.",
            "No solution.",
            "Include clickable web citations when web facts are used.",
            "Make it realistic for a live coding interview text editor.",
          ],
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "coding_question",
        schema: questionJsonSchema,
        strict: true,
      },
    },
  } as OpenAI.Responses.ResponseCreateParamsNonStreaming);

  return QuestionSchema.parse(JSON.parse(response.output_text));
}

export async function generateHint(
  question: Question,
  code: string,
  hintCount: number,
): Promise<Hint> {
  const client = openaiClient();
  if (!client) {
    return {
      hintLevel: Math.min(hintCount + 1, 5),
      nudge:
        "Start by naming the data structure that would let you avoid repeated scans, then write the invariant before coding more.",
      conceptsToReview: ["hash maps", "loop invariants", "edge cases"],
    };
  }

  const response = await client.responses.create({
    model: MODEL,
    input: [
      {
        role: "system",
        content:
          "You are a coding interviewer. Give a nudge that helps the candidate think, but never provide a complete solution or final code.",
      },
      {
        role: "user",
        content: JSON.stringify({ question, code, hintCount }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "coding_hint",
        schema: hintJsonSchema,
        strict: true,
      },
    },
  } as OpenAI.Responses.ResponseCreateParamsNonStreaming);

  return HintSchema.parse(JSON.parse(response.output_text));
}

export async function reviewSubmission(
  question: Question,
  code: string,
): Promise<Review> {
  const client = openaiClient();
  if (!client) {
    return {
      overallScore: 7,
      correctnessScore: 7,
      complexityScore: 7,
      codeQualityScore: 8,
      edgeCaseScore: 6,
      strengths: ["The approach is readable and easy to discuss."],
      issues: ["Call out edge cases explicitly before finalizing."],
      suggestedNextSteps: [
        "Explain time and space complexity out loud.",
        "Add tests mentally for empty, duplicate, and boundary inputs.",
      ],
      interviewerVerdict:
        "This would be a solid interview attempt if the candidate clearly defends edge cases and complexity.",
    };
  }

  const response = await client.responses.create({
    model: MODEL,
    input: [
      {
        role: "system",
        content:
          "You are a senior coding interviewer. Review the candidate's Python answer like a human interviewer. Do not execute code. Grade reasoning, correctness, complexity, edge cases, and communication readiness.",
      },
      {
        role: "user",
        content: JSON.stringify({ question, code }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "coding_review",
        schema: reviewJsonSchema,
        strict: true,
      },
    },
  } as OpenAI.Responses.ResponseCreateParamsNonStreaming);

  return ReviewSchema.parse(JSON.parse(response.output_text));
}

function demoQuestion(profile: ProfileInput, questionNumber: number): Question {
  return {
    title:
      questionNumber === 1
        ? "Sessionized Login Events"
        : `Python Interview Pattern ${questionNumber}`,
    difficulty: questionNumber === 1 ? "medium" : "easy",
    prompt: `You are interviewing for ${profile.role} at ${profile.company}. Given a list of login event timestamps sorted in ascending order, group them into sessions. A new session starts when the gap between two consecutive events is greater than 30 minutes. Return the start time, end time, and count for each session.`,
    constraints: [
      "Use Python.",
      "Do not rely on external libraries.",
      "Optimize for a single pass over the events.",
    ],
    examples: [
      "Input: [0, 10, 40, 100] -> Output: [(0, 40, 3), (100, 100, 1)]",
    ],
    followUps: [
      "How would you handle unsorted input?",
      "How would this change for streaming events?",
    ],
    companyRelevance:
      "This demo question targets common data-processing and hashmap/list reasoning patterns used in technical screens.",
    citations: [
      {
        title: "Demo mode: configure OPENAI_API_KEY for live web-grounded generation",
        url: "https://developers.openai.com/api/docs/guides/tools-web-search",
      },
    ],
  };
}
