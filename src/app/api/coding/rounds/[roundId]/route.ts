import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoundById, updateRoundCode } from "@/lib/data";
import { getSessionOwner } from "@/lib/session";

const RoundUpdateSchema = z.object({
  code: z.string().default(""),
});

type RouteContext = {
  params: Promise<{
    roundId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const owner = await getSessionOwner();
  if (!owner) {
    return NextResponse.json({ error: "No active session." }, { status: 401 });
  }

  const { roundId } = await context.params;
  const round = await getRoundById(owner, roundId);
  if (!round) {
    return NextResponse.json({ error: "Round not found." }, { status: 404 });
  }

  return NextResponse.json({ round });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const owner = await getSessionOwner();
    if (!owner) {
      return NextResponse.json({ error: "No active session." }, { status: 401 });
    }

    const { roundId } = await context.params;
    const body = RoundUpdateSchema.parse(await request.json());
    await updateRoundCode(owner, roundId, body.code);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update round.",
      },
      { status: 400 },
    );
  }
}
