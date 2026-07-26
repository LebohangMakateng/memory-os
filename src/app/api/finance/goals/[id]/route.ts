import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { recordFinanceAudit } from "@/lib/finance/audit";
import { normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeGoalSchema } from "@/lib/finance/validation";

export const runtime = "nodejs";
const ownerId = "owner";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await context.params;
  const parsed = financeGoalSchema.partial().safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: before, error: loadError } = await supabase.from("finance_goals").select("*").eq("id", id).eq("owner_id", ownerId).single();
  if (loadError) return Response.json({ error: loadError.message }, { status: loadError.code === "PGRST116" ? 404 : 500 });
  const patch = {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.goalType !== undefined ? { goal_type: parsed.data.goalType } : {}),
    ...(parsed.data.targetAmount !== undefined ? { target_amount: normalizeMoneyInput(parsed.data.targetAmount) } : {}),
    ...(parsed.data.currentAmount !== undefined ? { current_amount: normalizeMoneyInput(parsed.data.currentAmount) } : {}),
    ...(parsed.data.targetDate !== undefined ? { target_date: parsed.data.targetDate || null } : {}),
    ...(parsed.data.monthlyContribution !== undefined ? { monthly_contribution: normalizeMoneyInput(parsed.data.monthlyContribution) } : {}),
    ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
  };
  const { data, error } = await supabase.from("finance_goals").update({ ...patch, updated_at: nowIso() }).eq("id", id).eq("owner_id", ownerId).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await recordFinanceAudit(supabase, { entityType: "goal", entityId: id, action: "update", before, after: data });
  return Response.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data: before, error: loadError } = await supabase.from("finance_goals").select("*").eq("id", id).eq("owner_id", ownerId).single();
  if (loadError) return Response.json({ error: loadError.message }, { status: loadError.code === "PGRST116" ? 404 : 500 });
  const { error } = await supabase.from("finance_goals").delete().eq("id", id).eq("owner_id", ownerId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await recordFinanceAudit(supabase, { entityType: "goal", entityId: id, action: "delete", before });
  return Response.json({ ok: true });
}
