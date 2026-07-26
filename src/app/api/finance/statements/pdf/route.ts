import { requireSession } from "@/lib/auth/session";
import { extractTextFromPdfBytes } from "@/lib/finance/pdf-extraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireSession();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Upload a PDF file." }, { status: 400 });
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return Response.json({ error: "Only PDF files are supported." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "PDF must be 10MB or smaller." }, { status: 400 });
  const text = extractTextFromPdfBytes(Buffer.from(await file.arrayBuffer()));
  if (!text) return Response.json({ error: "No embedded text was detected. Scanned PDF OCR requires adding an OCR provider or local OCR binary." }, { status: 422 });
  return Response.json({ text });
}
