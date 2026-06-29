import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { hasSupabaseAuthConfig } from "@/lib/supabase";
import type { SessionOwner } from "@/lib/data";

const SESSION_COOKIE = "interview_prep_session";

export async function getOrCreateSessionId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;

  if (existing) {
    return existing;
  }

  const sessionId = randomUUID();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return sessionId;
}

export async function getSessionId() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getOrCreateSessionOwner(): Promise<SessionOwner> {
  const sessionId = await getOrCreateSessionId();
  const userId = await getAuthenticatedUserId();

  return { sessionId, userId };
}

export async function getSessionOwner(): Promise<SessionOwner | null> {
  const sessionId = await getSessionId();
  if (!sessionId) {
    return null;
  }

  const userId = await getAuthenticatedUserId();
  return { sessionId, userId };
}

async function getAuthenticatedUserId() {
  if (!hasSupabaseAuthConfig()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}
