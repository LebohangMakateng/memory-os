import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { buildTransactionFingerprint, financeMonthFromDate, normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeTransactionCreateSchema } from "@/lib/finance/validation";
import { recordFinanceAudit } from "@/lib/finance/audit";

export const runtime = "nodejs";
const ownerId = "owner";

function toTransactionPayload(transaction: {
  accountId: string;
  transactionDate: string;
  postedDate?: string | null;
  description: string;
  normalizedMerchant?: string | null;
  amount: string;
  transactionType: string;
  categoryId?: string | null;
  notes?: string | null;
}) {
  return {
    owner_id: ownerId,
    account_id: transaction.accountId,
    transaction_date: transaction.transactionDate,
    posted_date: transaction.postedDate || null,
    financial_month: financeMonthFromDate(transaction.transactionDate),
    description: transaction.description,
    normalized_merchant: transaction.normalizedMerchant || null,
    amount: normalizeMoneyInput(transaction.amount),
    transaction_type: transaction.transactionType,
    category_id: transaction.categoryId || null,
    source: "manual",
    source_reference: null,
    duplicate_fingerprint: buildTransactionFingerprint({
      accountId: transaction.accountId,
      transactionDate: transaction.transactionDate,
      amount: transaction.amount,
      transactionType: transaction.transactionType,
      description: transaction.description,
      source: "manual",
    }),
    notes: transaction.notes || null,
  };
}

export async function POST(request: Request) {
  await requireSession();
  const parsed = financeTransactionCreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("finance_transactions").insert(toTransactionPayload(parsed.data)).select("*").single();
  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return Response.json({ error: error.code === "23505" ? "This transaction looks like a duplicate." : error.message }, { status });
  }
  await recordFinanceAudit(supabase, { entityType: "transaction", entityId: data.id, action: "create", after: data });
  return Response.json(data, { status: 201 });
}
