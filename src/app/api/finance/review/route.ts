import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { currentFinanceMonth } from "@/lib/finance/calculations";
import { monthlyReview } from "@/lib/finance/analytics";
import type { FinanceBudgetLine, FinanceCategory, FinanceMonthlyPlan, FinanceTransaction } from "@/lib/finance/types";

export const runtime = "nodejs";
const ownerId = "owner";

export async function GET() {
  await requireSession();
  const month = currentFinanceMonth();
  const supabase = getSupabaseAdmin();
  const [categories, transactions, plan, goals, commitments, recurring] = await Promise.all([
    supabase.from("finance_categories").select("*").eq("owner_id", ownerId).eq("is_active", true),
    supabase.from("finance_transactions").select("*").eq("owner_id", ownerId).eq("financial_month", month),
    supabase.from("finance_monthly_plans").select("*").eq("owner_id", ownerId).eq("month", month).maybeSingle(),
    supabase.from("finance_goals").select("*").eq("owner_id", ownerId).eq("status", "active"),
    supabase.from("finance_commitments").select("*").eq("owner_id", ownerId),
    supabase.from("finance_recurring_expenses").select("*").eq("owner_id", ownerId).eq("is_active", true),
  ]);
  const error = categories.error || transactions.error || plan.error || goals.error || commitments.error || recurring.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let budgetLines: FinanceBudgetLine[] = [];
  if (plan.data?.id) {
    const budget = await supabase.from("finance_budget_lines").select("*").eq("plan_id", plan.data.id);
    if (budget.error) return Response.json({ error: budget.error.message }, { status: 500 });
    budgetLines = (budget.data ?? []) as FinanceBudgetLine[];
  }
  return Response.json(monthlyReview({ month, categories: (categories.data ?? []) as FinanceCategory[], transactions: (transactions.data ?? []) as FinanceTransaction[], plan: plan.data as FinanceMonthlyPlan | null, budgetLines, goals: goals.data ?? [], commitments: commitments.data ?? [], recurringExpenses: recurring.data ?? [] }));
}
