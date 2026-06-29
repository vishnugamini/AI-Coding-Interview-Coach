import { NextResponse } from "next/server";
import {
  getPreviousQuestionTitles,
  getProfile,
  saveQuestion,
} from "@/lib/data";
import { generateCodingQuestion } from "@/lib/openai";
import { getSessionOwner } from "@/lib/session";

export async function POST() {
  try {
    const owner = await getSessionOwner();
    if (!owner) {
      return NextResponse.json(
        { error: "Create your interview profile first." },
        { status: 401 },
      );
    }

    const profile = await getProfile(owner);
    if (!profile) {
      return NextResponse.json(
        { error: "Create your interview profile first." },
        { status: 404 },
      );
    }

    const previousTitles = await getPreviousQuestionTitles(owner);
    const questionNumber = previousTitles.length + 1;
    const question = await generateCodingQuestion(
      profile,
      questionNumber,
      previousTitles,
    );
    const round = await saveQuestion(owner, question, questionNumber);

    return NextResponse.json({ round });
  } catch (error) {
    console.error("Unable to generate coding question", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to generate question.",
      },
      { status: 500 },
    );
  }
}
