import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeAccountCreateSchema } from "@/lib/finance/validation";
import { recordFinanceAudit } from "@/lib/finance/audit";

export const runtime = "nodejs";
const ownerId = "owner";

export async function POST(request: Request) {
  await requireSession();
  const parsed = financeAccountCreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("finance_accounts").insert({
    owner_id: ownerId,
    name: parsed.data.name,
    account_type: parsed.data.accountType,
    currency: "ZAR",
    masked_identifier: parsed.data.maskedIdentifier || null,
    opening_balance: normalizeMoneyInput(parsed.data.openingBalance),
  }).select("*").single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  await recordFinanceAudit(supabase, { entityType: "account", entityId: data.id, action: "create", after: data });
  return Response.json(data, { status: 201 });
}
