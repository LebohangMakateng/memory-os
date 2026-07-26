import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";

export const runtime = "nodejs";
const ownerId = "owner";

export async function POST(_request: Request, context: { params: Promise<{ actionId: string }> }) {
  await requireSession();
  const { actionId } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("finance_ai_actions")
    .update({ status: "rejected", rejected_at: nowIso() })
    .eq("id", actionId)
    .eq("owner_id", ownerId)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  return Response.json({ action: data });
}
