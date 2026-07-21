import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { planningDraftUpdateSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext<"/api/execution/plan-drafts/[draftId]">) {
  await requireSession();
  const { draftId } = await context.params;
  const parsed = planningDraftUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_planning_drafts")
    .update({
      proposal: parsed.data.proposal,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      updated_at: nowIso(),
    })
    .eq("id", draftId)
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  return Response.json(data);
}
