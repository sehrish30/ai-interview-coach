import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/require-user";
import { handleApiError, apiError } from "@/lib/api-response";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    await requireUser(supabase);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiError(400, "validation_error", "No file uploaded");
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return apiError(400, "invalid_file_type", "Only PDF files are supported");
    }
    if (file.size > MAX_FILE_BYTES) {
      return apiError(413, "file_too_large", "PDF must be smaller than 5MB");
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    let text: string;
    try {
      const pdf = await getDocumentProxy(buffer);
      const result = await extractText(pdf, { mergePages: true });
      text = (Array.isArray(result.text) ? result.text.join("\n") : result.text).trim();
    } catch {
      return apiError(422, "unreadable_pdf", "Could not read this PDF. It may be corrupted or encrypted.");
    }

    if (text.length < 50) {
      return apiError(
        422,
        "no_extractable_text",
        "No readable text found in this PDF. It may be a scanned image — try pasting the text instead.",
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    return handleApiError(error);
  }
}
