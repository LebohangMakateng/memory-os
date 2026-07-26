import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { recordFinanceAudit } from "@/lib/finance/audit";
import { normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeCommitmentSchema } from "@/lib/finance/validation";

export const runtime = "nodejs";
const ownerId = "owner";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await context.params;
  const parsed = financeCommitmentSchema.partial().safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: before, error: loadError } = await supabase.from("finance_commitments").select("*").eq("id", id).eq("owner_id", ownerId).single();
  if (loadError) return Response.json({ error: loadError.message }, { status: loadError.code === "PGRST116" ? 404 : 500 });
  const patch = {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.amount !== undefined ? { amount: normalizeMoneyInput(parsed.data.amount) } : {}),
    ...(parsed.data.dueDate !== undefined ? { due_date: parsed.data.dueDate } : {}),
    ...(parsed.data.categoryId !== undefined ? { category_id: parsed.data.categoryId || null } : {}),
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
  };
  const { data, error } = await supabase.from("finance_commitments").update({ ...patch, updated_at: nowIso() }).eq("id", id).eq("owner_id", ownerId).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await recordFinanceAudit(supabase, { entityType: "commitment", entityId: id, action: "update", before, after: data });
  return Response.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data: before, error: loadError } = await supabase.from("finance_commitments").select("*").eq("id", id).eq("owner_id", ownerId).single();
  if (loadError) return Response.json({ error: loadError.message }, { status: loadError.code === "PGRST116" ? 404 : 500 });
  const { error } = await supabase.from("finance_commitments").delete().eq("id", id).eq("owner_id", ownerId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await recordFinanceAudit(supabase, { entityType: "commitment", entityId: id, action: "delete", before });
  return Response.json({ ok: true });
}
