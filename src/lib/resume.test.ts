import { describe, expect, it } from "vitest";
import { extractResumeText } from "@/lib/resume";

describe("extractResumeText", () => {
  it("uses pasted text when no file is supplied", async () => {
    await expect(extractResumeText(null, "  Python engineer resume  ")).resolves.toBe(
      "Python engineer resume",
    );
  });

  it("extracts txt file content", async () => {
    const file = new File(["Resume from file"], "resume.txt", {
      type: "text/plain",
    }) as File & { arrayBuffer: () => Promise<ArrayBuffer> };
    file.arrayBuffer = async () => new TextEncoder().encode("Resume from file").buffer;

    await expect(extractResumeText(file, "")).resolves.toBe("Resume from file");
  });

  it("rejects unsupported file types", async () => {
    const file = new File(["bad"], "resume.csv", { type: "text/csv" });

    await expect(extractResumeText(file, "")).rejects.toThrow(
      "Unsupported resume file type",
    );
  });
});
