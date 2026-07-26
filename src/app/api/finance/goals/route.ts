import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeGoalSchema } from "@/lib/finance/validation";

export const runtime = "nodejs";
const ownerId = "owner";

export async function POST(request: Request) {
  await requireSession();
  const parsed = financeGoalSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const payload = {
    owner_id: ownerId,
    name: parsed.data.name,
    goal_type: parsed.data.goalType,
    target_amount: normalizeMoneyInput(parsed.data.targetAmount),
    current_amount: normalizeMoneyInput(parsed.data.currentAmount),
    target_date: parsed.data.targetDate || null,
    monthly_contribution: normalizeMoneyInput(parsed.data.monthlyContribution),
    priority: parsed.data.priority,
  };
  const { data, error } = await supabase.from("finance_goals").insert(payload).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
