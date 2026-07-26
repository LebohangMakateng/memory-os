import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { recordFinanceAudit } from "@/lib/finance/audit";
import { normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeNetWorthSchema } from "@/lib/finance/validation";

export const runtime = "nodejs";
const ownerId = "owner";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await context.params;
  const parsed = financeNetWorthSchema.partial().safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: before, error: loadError } = await supabase.from("finance_net_worth_snapshots").select("*").eq("id", id).eq("owner_id", ownerId).single();
  if (loadError) return Response.json({ error: loadError.message }, { status: loadError.code === "PGRST116" ? 404 : 500 });
  const patch = {
    ...(parsed.data.snapshotDate !== undefined ? { snapshot_date: parsed.data.snapshotDate } : {}),
    ...(parsed.data.cashAmount !== undefined ? { cash_amount: normalizeMoneyInput(parsed.data.cashAmount) } : {}),
    ...(parsed.data.investmentAmount !== undefined ? { investment_amount: normalizeMoneyInput(parsed.data.investmentAmount) } : {}),
    ...(parsed.data.assetAmount !== undefined ? { asset_amount: normalizeMoneyInput(parsed.data.assetAmount) } : {}),
    ...(parsed.data.debtAmount !== undefined ? { debt_amount: normalizeMoneyInput(parsed.data.debtAmount) } : {}),
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
  };
  const { data, error } = await supabase.from("finance_net_worth_snapshots").update({ ...patch, updated_at: nowIso() }).eq("id", id).eq("owner_id", ownerId).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await recordFinanceAudit(supabase, { entityType: "net_worth_snapshot", entityId: id, action: "update", before, after: data });
  return Response.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data: before, error: loadError } = await supabase.from("finance_net_worth_snapshots").select("*").eq("id", id).eq("owner_id", ownerId).single();
  if (loadError) return Response.json({ error: loadError.message }, { status: loadError.code === "PGRST116" ? 404 : 500 });
  const { error } = await supabase.from("finance_net_worth_snapshots").delete().eq("id", id).eq("owner_id", ownerId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await recordFinanceAudit(supabase, { entityType: "net_worth_snapshot", entityId: id, action: "delete", before });
  return Response.json({ ok: true });
}
