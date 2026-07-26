import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeNetWorthSchema } from "@/lib/finance/validation";

export const runtime = "nodejs";
const ownerId = "owner";

export async function POST(request: Request) {
  await requireSession();
  const parsed = financeNetWorthSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const payload = {
    owner_id: ownerId,
    snapshot_date: parsed.data.snapshotDate,
    cash_amount: normalizeMoneyInput(parsed.data.cashAmount),
    investment_amount: normalizeMoneyInput(parsed.data.investmentAmount),
    asset_amount: normalizeMoneyInput(parsed.data.assetAmount),
    debt_amount: normalizeMoneyInput(parsed.data.debtAmount),
    notes: parsed.data.notes || null,
  };
  const { data, error } = await supabase.from("finance_net_worth_snapshots").insert(payload).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
