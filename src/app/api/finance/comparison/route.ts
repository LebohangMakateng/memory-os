import { requireSession } from "@/lib/auth/session";
import { compareMonths } from "@/lib/finance/intelligence";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { currentFinanceMonth } from "@/lib/finance/calculations";
import type { FinanceBudgetLine, FinanceCategory, FinanceMonthlyPlan, FinanceTransaction } from "@/lib/finance/types";

const ownerId = "owner";

function previousMonth(month: string) {
  const [year, rawMonth] = month.split("-").map(Number);
  const date = new Date(year, rawMonth - 2, 1);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

async function loadFinanceScope(month = currentFinanceMonth()) {
  const supabase = getSupabaseAdmin();
  const [categories, transactions, previousTransactions, plan, goals, commitments, recurring] = await Promise.all([
    supabase.from("finance_categories").select("*").eq("owner_id", ownerId).eq("is_active", true),
    supabase.from("finance_transactions").select("*").eq("owner_id", ownerId).eq("financial_month", month),
    supabase.from("finance_transactions").select("*").eq("owner_id", ownerId).eq("financial_month", previousMonth(month)),
    supabase.from("finance_monthly_plans").select("*").eq("owner_id", ownerId).eq("month", month).maybeSingle(),
    supabase.from("finance_goals").select("*").eq("owner_id", ownerId).eq("status", "active"),
    supabase.from("finance_commitments").select("*").eq("owner_id", ownerId),
    supabase.from("finance_recurring_expenses").select("*").eq("owner_id", ownerId).eq("is_active", true),
  ]);
  const error = categories.error || transactions.error || previousTransactions.error || plan.error || goals.error || commitments.error || recurring.error;
  if (error) throw new Error(error.message);
  let budgetLines: FinanceBudgetLine[] = [];
  if (plan.data?.id) {
    const budget = await supabase.from("finance_budget_lines").select("*").eq("plan_id", plan.data.id);
    if (budget.error) throw new Error(budget.error.message);
    budgetLines = (budget.data ?? []) as FinanceBudgetLine[];
  }
  return { month, previousMonth: previousMonth(month), categories: (categories.data ?? []) as FinanceCategory[], transactions: (transactions.data ?? []) as FinanceTransaction[], previousTransactions: (previousTransactions.data ?? []) as FinanceTransaction[], plan: plan.data as FinanceMonthlyPlan | null, budgetLines, goals: goals.data ?? [], commitments: commitments.data ?? [], recurringExpenses: recurring.data ?? [] };
}

export const runtime = "nodejs";
export async function GET() {
  await requireSession();
  try {
    const scope = await loadFinanceScope();
    return Response.json(compareMonths({ currentMonth: scope.month, previousMonth: scope.previousMonth, currentTransactions: scope.transactions, previousTransactions: scope.previousTransactions, categories: scope.categories, currentPlan: scope.plan, currentBudgetLines: scope.budgetLines }));
  } catch (caught) {
    return Response.json({ error: caught instanceof Error ? caught.message : "Could not compare months." }, { status: 500 });
  }
}
