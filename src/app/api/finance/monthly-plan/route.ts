import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeMonthlyPlanSchema } from "@/lib/finance/validation";

export const runtime = "nodejs";
const ownerId = "owner";

export async function PUT(request: Request) {
  await requireSession();
  const parsed = financeMonthlyPlanSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const planPayload = {
    owner_id: ownerId,
    month: parsed.data.month,
    currency: "ZAR",
    expected_income: normalizeMoneyInput(parsed.data.expectedIncome),
    savings_target: normalizeMoneyInput(parsed.data.savingsTarget),
    notes: parsed.data.notes || null,
    updated_at: nowIso(),
  };

  const { data: plan, error: planError } = await supabase.from("finance_monthly_plans").upsert(planPayload, { onConflict: "owner_id,month" }).select("*").single();
  if (planError) return Response.json({ error: planError.message }, { status: 500 });

  const { error: deleteError } = await supabase.from("finance_budget_lines").delete().eq("plan_id", plan.id);
  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

  const lines = parsed.data.budgetLines
    .filter((line) => normalizeMoneyInput(line.plannedAmount) !== "0.00")
    .map((line) => ({ plan_id: plan.id, category_id: line.categoryId, planned_amount: normalizeMoneyInput(line.plannedAmount), updated_at: nowIso() }));
  if (lines.length) {
    const { error: lineError } = await supabase.from("finance_budget_lines").insert(lines);
    if (lineError) return Response.json({ error: lineError.message }, { status: 500 });
  }

  return Response.json({ plan, budgetLines: lines });
}
