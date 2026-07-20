import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { opportunitySchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

export async function GET() {
  await requireSession();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("opportunities").select("*").eq("status", "inbox").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  await requireSession();
  const parsed = opportunitySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("opportunities").insert({ title: parsed.data.title, note: parsed.data.note }).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}