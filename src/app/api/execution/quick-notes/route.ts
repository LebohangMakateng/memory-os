import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { quickNoteSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

export async function GET() {
  await requireSession();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("quick_notes").select("*").order("created_at", { ascending: false }).limit(20);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  await requireSession();
  const parsed = quickNoteSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("quick_notes").insert(parsed.data).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
