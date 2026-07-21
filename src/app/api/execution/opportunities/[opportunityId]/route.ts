import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { opportunityUpdateSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext<"/api/execution/opportunities/[opportunityId]">) {
  await requireSession();
  const { opportunityId } = await context.params;
  const parsed = opportunityUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.title !== undefined) payload.title = parsed.data.title;
  if (parsed.data.note !== undefined) payload.note = parsed.data.note || null;
  if (parsed.data.status !== undefined) {
    payload.status = parsed.data.status;
    payload.reviewed_at = parsed.data.status === "inbox" ? null : new Date().toISOString();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("opportunities").update(payload).eq("id", opportunityId).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_request: Request, context: RouteContext<"/api/execution/opportunities/[opportunityId]">) {
  await requireSession();
  const { opportunityId } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("opportunities")
    .update({ status: "archived", reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", opportunityId)
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
