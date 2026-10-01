import { NextResponse } from "next/server";
import mammoth from "mammoth";

import { isAIError } from "@/lib/ai";
import { runResumeParse } from "@/lib/resume/parse";

/**
 * Resume parsing endpoint.
 *
 * Accepts multipart form data (`file`, `consent`). Validates type and size
 * server-side, then: PDFs go to Gemini as inline file input, DOCX files are
 * text-extracted with mammoth and the text is sent. Returns Zod-validated
 * `{ summary, skills, experience, education, projects }`.
 *
 * Privacy: file bytes and parsed text never reach logs. The raw file is not
 * stored anywhere — DATABASE.md points `resumes.storage_path` at a private
 * bucket, and no service key exists in this environment, so persistence of
 * the parsed context happens only through the documented dev path or a
 * signed-in session later. The client always shows extracted data for
 * correction before continuing.
 */

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, "pdf" | "docx"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Request must be multipart form data." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  const consent = form.get("consent");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { status: "error", message: "Attach a PDF or DOCX resume." },
      { status: 400 }
    );
  }
  if (consent !== "yes") {
    return NextResponse.json(
      {
        status: "error",
        message: "Resume parsing needs your consent first.",
      },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { status: "error", message: "Keep the resume under 5 MB." },
      { status: 400 }
    );
  }

  const ext = extOf(file.name);
  const kind =
    ALLOWED[file.type] ??
    (ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : undefined);
  if (!kind) {
    return NextResponse.json(
      { status: "error", message: "Only PDF or DOCX resumes are supported." },
      { status: 400 }
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());

    if (kind === "pdf") {
      const { parsed, model, provider } = await runResumeParse({
        attachment: {
          mimeType: "application/pdf",
          base64Data: bytes.toString("base64"),
        },
      });
      return NextResponse.json({ status: "ok", parsed, model, provider });
    }

    const { value: text } = await mammoth.extractRawText({ buffer: bytes });
    if (!text.trim()) {
      return NextResponse.json(
        {
          status: "error",
          message: "No readable text found in that DOCX file.",
        },
        { status: 422 }
      );
    }
    const { parsed, model, provider } = await runResumeParse({
      text: text.slice(0, 20000),
    });
    return NextResponse.json({ status: "ok", parsed, model, provider });
  } catch (error) {
    if (isAIError(error)) {
      const message =
        error.code === "unavailable"
          ? error.message
          : "Lory couldn't read that resume right now. Try again.";
      return NextResponse.json(
        { status: "error", code: error.code, message, retryable: error.retryable },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { status: "error", message: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
