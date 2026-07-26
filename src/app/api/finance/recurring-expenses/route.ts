import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeRecurringExpenseSchema } from "@/lib/finance/validation";

export const runtime = "nodejs";
const ownerId = "owner";

export async function POST(request: Request) {
  await requireSession();
  const parsed = financeRecurringExpenseSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const payload = {
    owner_id: ownerId,
    name: parsed.data.name,
    merchant: parsed.data.merchant || null,
    category_id: parsed.data.categoryId || null,
    amount: normalizeMoneyInput(parsed.data.amount),
    frequency: parsed.data.frequency,
    next_due_date: parsed.data.nextDueDate || null,
  };
  const { data, error } = await supabase.from("finance_recurring_expenses").insert(payload).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
