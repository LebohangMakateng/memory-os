import { formatCurrency, parseMoneyToCents, summarizeFinance } from "./calculations";
import { categoryAnalytics, financialHealthScore, forecastMonth, type FinanceCommitment, type FinanceGoal, type FinanceRecurringExpense } from "./analytics";
import type { FinanceBudgetLine, FinanceCategory, FinanceMonthlyPlan, FinanceTransaction } from "./types";

export function compareMonths(input: { currentMonth: string; previousMonth: string; currentTransactions: FinanceTransaction[]; previousTransactions: FinanceTransaction[]; categories: FinanceCategory[]; currentPlan: FinanceMonthlyPlan | null; currentBudgetLines: FinanceBudgetLine[] }) {
  const current = summarizeFinance({ transactions: input.currentTransactions, plan: input.currentPlan, budgetLines: input.currentBudgetLines });
  const previous = summarizeFinance({ transactions: input.previousTransactions });
  const currentCategories = categoryAnalytics(input.currentTransactions, input.categories, input.currentBudgetLines);
  const previousTotals = new Map<string, number>();
  for (const transaction of input.previousTransactions) {
    if (transaction.transaction_type !== "expense" || !transaction.category_id) continue;
    previousTotals.set(transaction.category_id, (previousTotals.get(transaction.category_id) ?? 0) + parseMoneyToCents(transaction.amount));
  }
  return {
    currentMonth: input.currentMonth,
    previousMonth: input.previousMonth,
    incomeChangeCents: current.incomeCents - previous.incomeCents,
    expenseChangeCents: current.expenseCents - previous.expenseCents,
    netChangeCents: current.netCents - previous.netCents,
    categoryChanges: currentCategories.slice(0, 10).map((row) => ({ category: row.category.name, currentCents: row.actualCents, previousCents: previousTotals.get(row.category.id) ?? 0, changeCents: row.actualCents - (previousTotals.get(row.category.id) ?? 0) })).sort((a, b) => Math.abs(b.changeCents) - Math.abs(a.changeCents)),
  };
}

export function weeklyCheckIn(input: { month: string; transactions: FinanceTransaction[]; categories: FinanceCategory[]; plan: FinanceMonthlyPlan | null; budgetLines: FinanceBudgetLine[]; commitments: FinanceCommitment[]; recurringExpenses: FinanceRecurringExpense[]; goals: FinanceGoal[] }) {
  const summary = summarizeFinance({ transactions: input.transactions, plan: input.plan, budgetLines: input.budgetLines });
  const categories = categoryAnalytics(input.transactions, input.categories, input.budgetLines);
  const forecast = forecastMonth(input);
  const score = financialHealthScore({ transactions: input.transactions, plan: input.plan, budgetLines: input.budgetLines, goals: input.goals, recurringExpenses: input.recurringExpenses });
  const atRisk = categories.filter((row) => row.usedPct !== null && row.usedPct >= 75).slice(0, 5);
  return {
    month: input.month,
    score,
    remainingMoney: formatCurrency(summary.remainingSpendableCents),
    projectedEnd: formatCurrency(forecast.projectedEndCents),
    categoriesAtRisk: atRisk.map((row) => row.category.name + " is at " + row.usedPct + "% of plan."),
    upcomingCommitments: input.commitments.filter((item) => item.status !== "paid").slice(0, 5).map((item) => item.name + " due " + item.due_date + " for " + formatCurrency(parseMoneyToCents(item.amount))),
    recommendedRestraint: atRisk.length ? "Stop or reduce spend in " + atRisk.map((row) => row.category.name).join(", ") + " until next review." : "No category is over the 75% warning line yet.",
  };
}

export function runScenario(input: { transactions: FinanceTransaction[]; plan: FinanceMonthlyPlan | null; budgetLines: FinanceBudgetLine[]; commitments: FinanceCommitment[]; recurringExpenses: FinanceRecurringExpense[]; incomeDeltaCents: number; expenseDeltaCents: number; savingsDeltaCents: number }) {
  const summary = summarizeFinance({ transactions: input.transactions, plan: input.plan, budgetLines: input.budgetLines });
  const forecast = forecastMonth(input);
  const baselineCents = forecast.projectedEndCents;
  const scenarioEndCents = baselineCents + input.incomeDeltaCents - input.expenseDeltaCents - input.savingsDeltaCents;
  return {
    baselineCents,
    scenarioEndCents,
    impactCents: scenarioEndCents - baselineCents,
    explanation: "Scenario changes projected month-end from " + formatCurrency(baselineCents) + " to " + formatCurrency(scenarioEndCents) + ". No real plan records were modified.",
  };
}
