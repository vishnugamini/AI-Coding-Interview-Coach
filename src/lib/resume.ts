import mammoth from "mammoth";
import { TextDecoder } from "node:util";

const MAX_RESUME_CHARS = 25_000;

export async function extractResumeText(file: File | null, pastedText: string) {
  const trimmedPaste = pastedText.trim();
  if (!file || file.size === 0) {
    return clampText(trimmedPaste);
  }

  const name = file.name.toLowerCase();
  const mime = file.type;

  if (mime === "text/plain" || name.endsWith(".txt")) {
    const buffer = await readFileBuffer(file);
    return clampText(new TextDecoder().decode(buffer).trim());
  }

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const buffer = await readFileBuffer(file);
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });

    try {
      const result = await parser.getText();
      return clampText(result.text.trim());
    } finally {
      await parser.destroy();
    }
  }

  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const buffer = await readFileBuffer(file);
    const result = await mammoth.extractRawText({ buffer });
    return clampText(result.value.trim());
  }

  throw new Error("Unsupported resume file type. Use PDF, DOCX, or TXT.");
}

function clampText(text: string) {
  return text.slice(0, MAX_RESUME_CHARS);
}

async function readFileBuffer(file: File) {
  if (typeof file.arrayBuffer === "function") {
    return Buffer.from(await file.arrayBuffer());
  }

  if (typeof file.text === "function") {
    return Buffer.from(await file.text());
  }

  throw new Error("Unable to read resume file.");
}
