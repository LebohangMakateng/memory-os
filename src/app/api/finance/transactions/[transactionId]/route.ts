import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { buildTransactionFingerprint, financeMonthFromDate, normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeTransactionUpdateSchema } from "@/lib/finance/validation";
import { recordFinanceAudit } from "@/lib/finance/audit";

export const runtime = "nodejs";
const ownerId = "owner";

type ExistingTransaction = {
  account_id: string;
  transaction_date: string;
  amount: string | number;
  transaction_type: string;
  description: string;
};

function toPatch(update: ReturnType<typeof financeTransactionUpdateSchema.parse>, existing: ExistingTransaction) {
  const accountId = update.accountId ?? existing.account_id;
  const transactionDate = update.transactionDate ?? existing.transaction_date;
  const amount = update.amount ?? String(existing.amount);
  const transactionType = update.transactionType ?? existing.transaction_type;
  const description = update.description ?? existing.description;

  return {
    ...(update.accountId !== undefined ? { account_id: update.accountId } : {}),
    ...(update.transactionDate !== undefined ? { transaction_date: update.transactionDate, financial_month: financeMonthFromDate(update.transactionDate) } : {}),
    ...(update.postedDate !== undefined ? { posted_date: update.postedDate || null } : {}),
    ...(update.description !== undefined ? { description: update.description } : {}),
    ...(update.normalizedMerchant !== undefined ? { normalized_merchant: update.normalizedMerchant || null } : {}),
    ...(update.amount !== undefined ? { amount: normalizeMoneyInput(update.amount) } : {}),
    ...(update.transactionType !== undefined ? { transaction_type: update.transactionType } : {}),
    ...(update.categoryId !== undefined ? { category_id: update.categoryId || null } : {}),
    ...(update.notes !== undefined ? { notes: update.notes || null } : {}),
    duplicate_fingerprint: buildTransactionFingerprint({ accountId, transactionDate, amount, transactionType, description, source: "manual" }),
    updated_at: nowIso(),
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ transactionId: string }> }) {
  await requireSession();
  const { transactionId } = await context.params;
  const parsed = financeTransactionUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing, error: loadError } = await supabase.from("finance_transactions").select("*").eq("id", transactionId).eq("owner_id", ownerId).single();
  if (loadError) return Response.json({ error: loadError.message }, { status: loadError.code === "PGRST116" ? 404 : 500 });

  const { data, error } = await supabase.from("finance_transactions").update(toPatch(parsed.data, existing as ExistingTransaction)).eq("id", transactionId).eq("owner_id", ownerId).select("*").single();
  if (error) return Response.json({ error: error.code === "23505" ? "This transaction looks like a duplicate." : error.message }, { status: error.code === "23505" ? 409 : 500 });
  await recordFinanceAudit(supabase, { entityType: "transaction", entityId: transactionId, action: "update", before: existing, after: data });
  return Response.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ transactionId: string }> }) {
  await requireSession();
  const { transactionId } = await context.params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("finance_transactions").delete().eq("id", transactionId).eq("owner_id", ownerId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
