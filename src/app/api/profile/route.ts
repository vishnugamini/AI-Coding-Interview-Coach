import { NextResponse } from "next/server";
import { ProfileInputSchema } from "@/lib/schemas";
import { getOrCreateSessionOwner, getSessionOwner } from "@/lib/session";
import { getProfile, saveProfile } from "@/lib/data";
import { extractResumeText } from "@/lib/resume";

export async function GET() {
  const owner = await getSessionOwner();
  if (!owner) {
    return NextResponse.json({ error: "No active session." }, { status: 401 });
  }

  const profile = await getProfile(owner);
  if (!profile) {
    return NextResponse.json(
      { error: "Create your interview profile first." },
      { status: 404 },
    );
  }

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const resumeFile = formData.get("resumeFile");
    const resumeText = await extractResumeText(
      resumeFile instanceof File ? resumeFile : null,
      String(formData.get("resumeText") ?? ""),
    );

    const profile = ProfileInputSchema.parse({
      resumeText,
      jobDescription: String(formData.get("jobDescription") ?? ""),
      company: String(formData.get("company") ?? ""),
      role: String(formData.get("role") ?? ""),
    });

    const owner = await getOrCreateSessionOwner();
    await saveProfile(owner, profile);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save interview profile.",
      },
      { status: 400 },
    );
  }
}
