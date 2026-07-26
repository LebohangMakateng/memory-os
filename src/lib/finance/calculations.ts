import type { FinanceBudgetLine, FinanceMonthlyPlan, FinanceTransaction } from "./types";

export const DEFAULT_CURRENCY = "ZAR";

export function financeMonthFromDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Expected date in YYYY-MM-DD format.");
  return date.slice(0, 7);
}

export function currentFinanceMonth(today = new Date()) {
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return year + "-" + month;
}

export function parseMoneyToCents(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const raw = String(value).trim().replace(/,/g, "");
  const match = raw.match(/^(-?)(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) throw new Error("Invalid money amount.");
  const sign = match[1] === "-" ? -1 : 1;
  const whole = Number.parseInt(match[2], 10);
  const cents = Number.parseInt((match[3] ?? "").padEnd(2, "0"), 10) || 0;
  return sign * (whole * 100 + cents);
}

export function centsToMoney(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return sign + Math.floor(absolute / 100) + "." + String(absolute % 100).padStart(2, "0");
}

export function formatCurrency(cents: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(cents / 100);
}

export function normalizeMoneyInput(value: string | number | null | undefined) {
  return centsToMoney(parseMoneyToCents(value));
}

export function transactionSignedCents(transaction: Pick<FinanceTransaction, "amount" | "transaction_type">) {
  const amount = parseMoneyToCents(transaction.amount);
  if (transaction.transaction_type === "income") return amount;
  if (transaction.transaction_type === "expense") return -amount;
  if (transaction.transaction_type === "adjustment") return amount;
  return 0;
}

export function buildTransactionFingerprint(input: { accountId: string; transactionDate: string; amount: string | number; transactionType: string; description: string; source?: string | null; }) {
  const normalizedDescription = input.description.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  return [input.accountId, input.transactionDate, centsToMoney(parseMoneyToCents(input.amount)), input.transactionType, normalizedDescription, input.source || "manual"].join("|");
}

export function summarizeFinance(input: { transactions: FinanceTransaction[]; plan?: FinanceMonthlyPlan | null; budgetLines?: FinanceBudgetLine[]; }) {
  const incomeCents = input.transactions.filter((transaction) => transaction.transaction_type === "income").reduce((total, transaction) => total + parseMoneyToCents(transaction.amount), 0);
  const expenseCents = input.transactions.filter((transaction) => transaction.transaction_type === "expense").reduce((total, transaction) => total + parseMoneyToCents(transaction.amount), 0);
  const adjustmentCents = input.transactions.filter((transaction) => transaction.transaction_type === "adjustment").reduce((total, transaction) => total + parseMoneyToCents(transaction.amount), 0);
  const plannedIncomeCents = parseMoneyToCents(input.plan?.expected_income ?? 0);
  const plannedSavingsCents = parseMoneyToCents(input.plan?.savings_target ?? 0);
  const plannedExpenseCents = (input.budgetLines ?? []).reduce((total, line) => total + parseMoneyToCents(line.planned_amount), 0);

  return {
    incomeCents,
    expenseCents,
    adjustmentCents,
    netCents: incomeCents - expenseCents + adjustmentCents,
    plannedIncomeCents,
    plannedExpenseCents,
    plannedSavingsCents,
    remainingSpendableCents: incomeCents - expenseCents - plannedSavingsCents,
    plannedRemainingCents: plannedIncomeCents - plannedExpenseCents - plannedSavingsCents,
    expenseVarianceCents: plannedExpenseCents - expenseCents,
  };
}

export function summarizeCategoryActuals(transactions: FinanceTransaction[]) {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.transaction_type !== "expense" || !transaction.category_id) continue;
    totals.set(transaction.category_id, (totals.get(transaction.category_id) ?? 0) + parseMoneyToCents(transaction.amount));
  }
  return totals;
}
