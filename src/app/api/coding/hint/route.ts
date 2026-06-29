import { NextResponse } from "next/server";
import { z } from "zod";
import { appendHint, getRoundById } from "@/lib/data";
import { generateHint } from "@/lib/openai";
import { getSessionOwner } from "@/lib/session";

const HintRequestSchema = z.object({
  roundId: z.string().min(1),
  code: z.string().default(""),
});

export async function POST(request: Request) {
  try {
    const owner = await getSessionOwner();
    if (!owner) {
      return NextResponse.json({ error: "No active session." }, { status: 401 });
    }

    const body = HintRequestSchema.parse(await request.json());
    const round = await getRoundById(owner, body.roundId);
    if (!round) {
      return NextResponse.json({ error: "Round not found." }, { status: 404 });
    }

    const hint = await generateHint(
      round.question,
      body.code,
      round.hintHistory.length,
    );
    const hintHistory = await appendHint(owner, round.id, hint);

    return NextResponse.json({ hint, hintHistory });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate hint.",
      },
      { status: 400 },
    );
  }
}
