import { NextResponse } from "next/server";
import { getRoundHistory } from "@/lib/data";
import { getSessionOwner } from "@/lib/session";

export async function GET() {
  const owner = await getSessionOwner();
  if (!owner) {
    return NextResponse.json({ error: "No active session." }, { status: 401 });
  }

  const rounds = await getRoundHistory(owner);
  return NextResponse.json({ rounds });
}
