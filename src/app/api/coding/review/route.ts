import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoundById, saveSubmission } from "@/lib/data";
import { reviewSubmission } from "@/lib/openai";
import { getSessionOwner } from "@/lib/session";

const ReviewRequestSchema = z.object({
  roundId: z.string().min(1),
  code: z.string().min(10, "Write a bit more code before submitting."),
});

export async function POST(request: Request) {
  try {
    const owner = await getSessionOwner();
    if (!owner) {
      return NextResponse.json({ error: "No active session." }, { status: 401 });
    }

    const body = ReviewRequestSchema.parse(await request.json());
    const round = await getRoundById(owner, body.roundId);
    if (!round) {
      return NextResponse.json({ error: "Round not found." }, { status: 404 });
    }

    const review = await reviewSubmission(round.question, body.code);
    await saveSubmission(owner, round.id, body.code, review);

    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to review submission.",
      },
      { status: 400 },
    );
  }
}
