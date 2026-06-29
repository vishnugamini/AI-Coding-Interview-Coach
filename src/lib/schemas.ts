import { z } from "zod";

export const CitationSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
});

export const QuestionSchema = z.object({
  title: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  prompt: z.string().min(1),
  constraints: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([]),
  followUps: z.array(z.string()).default([]),
  companyRelevance: z.string().min(1),
  citations: z.array(CitationSchema).default([]),
});

export const HintSchema = z.object({
  hintLevel: z.number().int().min(1).max(5),
  nudge: z.string().min(1),
  conceptsToReview: z.array(z.string()).default([]),
});

export const ReviewSchema = z.object({
  overallScore: z.number().min(0).max(10),
  correctnessScore: z.number().min(0).max(10),
  complexityScore: z.number().min(0).max(10),
  codeQualityScore: z.number().min(0).max(10),
  edgeCaseScore: z.number().min(0).max(10),
  strengths: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  suggestedNextSteps: z.array(z.string()).default([]),
  interviewerVerdict: z.string().min(1),
});

export const ProfileInputSchema = z.object({
  resumeText: z.string().min(20, "Resume content is too short."),
  jobDescription: z.string().min(20, "Job description is too short."),
  company: z.string().min(1, "Company is required."),
  role: z.string().min(1, "Role is required."),
});

export type Question = z.infer<typeof QuestionSchema>;
export type Hint = z.infer<typeof HintSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type ProfileInput = z.infer<typeof ProfileInputSchema>;
