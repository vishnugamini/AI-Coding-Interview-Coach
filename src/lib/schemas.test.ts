import { describe, expect, it } from "vitest";
import { HintSchema, QuestionSchema, ReviewSchema } from "@/lib/schemas";

describe("LLM schemas", () => {
  it("validates question payloads", () => {
    expect(
      QuestionSchema.parse({
        title: "Two Sum",
        difficulty: "easy",
        prompt: "Find a pair.",
        constraints: [],
        examples: [],
        followUps: [],
        companyRelevance: "Common screening pattern.",
        citations: [{ title: "Source", url: "https://example.com" }],
      }),
    ).toMatchObject({ title: "Two Sum" });
  });

  it("validates hint payloads", () => {
    expect(
      HintSchema.parse({
        hintLevel: 1,
        nudge: "Think about a hashmap.",
        conceptsToReview: ["hash tables"],
      }),
    ).toMatchObject({ hintLevel: 1 });
  });

  it("validates review payloads", () => {
    expect(
      ReviewSchema.parse({
        overallScore: 7,
        correctnessScore: 7,
        complexityScore: 8,
        codeQualityScore: 7,
        edgeCaseScore: 6,
        strengths: ["Clear loop"],
        issues: ["Missing empty input case"],
        suggestedNextSteps: ["Talk through edge cases"],
        interviewerVerdict: "Promising solution with one gap.",
      }),
    ).toMatchObject({ overallScore: 7 });
  });
});
