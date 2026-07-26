import { formatCurrency, parseMoneyToCents, summarizeFinance } from "./calculations";
import type { FinanceBudgetLine, FinanceCategory, FinanceMonthlyPlan, FinanceTransaction } from "./types";

export type FinanceGoal = { id: string; name: string; target_amount: string | number; current_amount: string | number; monthly_contribution: string | number; target_date: string | null; priority: number; status: string };
export type FinanceRecurringExpense = { id: string; name: string; merchant: string | null; amount: string | number; frequency: string; next_due_date: string | null; is_active: boolean; category_id: string | null };
export type FinanceCommitment = { id: string; name: string; amount: string | number; due_date: string; status: string; category_id: string | null; notes: string | null };
export type FinanceNetWorthSnapshot = { id: string; snapshot_date: string; cash_amount: string | number; investment_amount: string | number; asset_amount: string | number; debt_amount: string | number; notes: string | null };

export function categoryAnalytics(transactions: FinanceTransaction[], categories: FinanceCategory[], budgetLines: FinanceBudgetLine[]) {
  const budget = new Map(budgetLines.map((line) => [line.category_id, parseMoneyToCents(line.planned_amount)]));
  return categories.map((category) => {
    const actualCents = transactions.filter((transaction) => transaction.category_id === category.id && transaction.transaction_type === "expense").reduce((total, transaction) => total + parseMoneyToCents(transaction.amount), 0);
    const plannedCents = budget.get(category.id) ?? 0;
    return { category, actualCents, plannedCents, varianceCents: plannedCents - actualCents, usedPct: plannedCents > 0 ? Math.round((actualCents / plannedCents) * 100) : null };
  }).sort((a, b) => b.actualCents - a.actualCents);
}

export function merchantAnalytics(transactions: FinanceTransaction[]) {
  const totals = new Map<string, { merchant: string; count: number; totalCents: number }>();
  for (const transaction of transactions) {
    if (transaction.transaction_type !== "expense") continue;
    const merchant = transaction.normalized_merchant || transaction.description.slice(0, 80);
    const current = totals.get(merchant) ?? { merchant, count: 0, totalCents: 0 };
    current.count += 1;
    current.totalCents += parseMoneyToCents(transaction.amount);
    totals.set(merchant, current);
  }
  return [...totals.values()].sort((a, b) => b.totalCents - a.totalCents).slice(0, 10);
}

export function moneyLeakAnalysis(transactions: FinanceTransaction[], categories: FinanceCategory[], budgetLines: FinanceBudgetLine[]) {
  const byCategory = categoryAnalytics(transactions, categories, budgetLines);
  const discretionary = new Set(categories.filter((category) => category.group_name === "lifestyle").map((category) => category.id));
  return byCategory
    .filter((row) => discretionary.has(row.category.id) || row.varianceCents < 0)
    .map((row) => ({ ...row, reason: row.varianceCents < 0 ? "Over budget" : "Discretionary spend" }))
    .slice(0, 6);
}

export function financialHealthScore(input: { transactions: FinanceTransaction[]; plan: FinanceMonthlyPlan | null; budgetLines: FinanceBudgetLine[]; goals: FinanceGoal[]; recurringExpenses: FinanceRecurringExpense[] }) {
  const summary = summarizeFinance({ transactions: input.transactions, plan: input.plan, budgetLines: input.budgetLines });
  let score = 70;
  const savingsRate = summary.incomeCents > 0 ? summary.plannedSavingsCents / summary.incomeCents : 0;
  if (savingsRate >= 0.2) score += 10;
  if (savingsRate < 0.05) score -= 10;
  if (summary.expenseVarianceCents < 0) score -= 15;
  if (summary.remainingSpendableCents < 0) score -= 20;
  const recurringCents = input.recurringExpenses.filter((item) => item.is_active).reduce((total, item) => total + parseMoneyToCents(item.amount), 0);
  if (summary.incomeCents > 0 && recurringCents / summary.incomeCents > 0.4) score -= 10;
  if (input.goals.some((goal) => goal.status === "active" && parseMoneyToCents(goal.monthly_contribution) > 0)) score += 5;
  return Math.max(0, Math.min(100, score));
}

export function forecastMonth(input: { transactions: FinanceTransaction[]; plan: FinanceMonthlyPlan | null; budgetLines: FinanceBudgetLine[]; commitments: FinanceCommitment[]; recurringExpenses: FinanceRecurringExpense[] }) {
  const summary = summarizeFinance({ transactions: input.transactions, plan: input.plan, budgetLines: input.budgetLines });
  const commitmentCents = input.commitments.filter((item) => item.status !== "paid").reduce((total, item) => total + parseMoneyToCents(item.amount), 0);
  const recurringCents = input.recurringExpenses.filter((item) => item.is_active).reduce((total, item) => total + parseMoneyToCents(item.amount), 0);
  const projectedExpensesCents = Math.max(summary.expenseCents, summary.plannedExpenseCents) + commitmentCents + recurringCents;
  const projectedEndCents = Math.max(summary.incomeCents, summary.plannedIncomeCents) - projectedExpensesCents - summary.plannedSavingsCents;
  return { projectedExpensesCents, commitmentCents, recurringCents, projectedEndCents };
}

export function monthlyReview(input: { month: string; transactions: FinanceTransaction[]; categories: FinanceCategory[]; plan: FinanceMonthlyPlan | null; budgetLines: FinanceBudgetLine[]; goals: FinanceGoal[]; commitments: FinanceCommitment[]; recurringExpenses: FinanceRecurringExpense[] }) {
  const summary = summarizeFinance({ transactions: input.transactions, plan: input.plan, budgetLines: input.budgetLines });
  const leaks = moneyLeakAnalysis(input.transactions, input.categories, input.budgetLines);
  const forecast = forecastMonth(input);
  const score = financialHealthScore({ ...input, goals: input.goals, recurringExpenses: input.recurringExpenses });
  return {
    title: "Monthly financial review for " + input.month,
    score,
    scoreLabel: score >= 80 ? "Strong" : score >= 60 ? "Watch closely" : "Needs intervention",
    whatImproved: summary.remainingSpendableCents >= 0 ? ["Remaining spendable money is still positive at " + formatCurrency(summary.remainingSpendableCents) + "."] : [],
    whatDeteriorated: summary.remainingSpendableCents < 0 ? ["You are beyond planned spendable money by " + formatCurrency(Math.abs(summary.remainingSpendableCents)) + "."] : [],
    biggestMoneyLeaks: leaks.map((leak) => leak.category.name + ": " + formatCurrency(leak.actualCents) + " (" + leak.reason + ")"),
    budgetMisses: leaks.filter((leak) => leak.varianceCents < 0).map((leak) => leak.category.name + " overspent by " + formatCurrency(Math.abs(leak.varianceCents)) + "."),
    forecast: "Projected month-end after savings and known obligations: " + formatCurrency(forecast.projectedEndCents) + ".",
    priorities: ["Protect the savings target before discretionary spend.", "Review the largest discretionary category.", "Confirm upcoming commitments before adding new spend."],
  };
}
