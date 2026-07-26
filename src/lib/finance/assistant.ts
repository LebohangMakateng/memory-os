import { z } from "zod";
import { buildTransactionFingerprint, financeMonthFromDate, formatCurrency, normalizeMoneyInput, parseMoneyToCents, summarizeFinance } from "./calculations";
import { financeMonthlyPlanSchema, financeTransactionCreateSchema } from "./validation";
import type { FinanceAccount, FinanceBudgetLine, FinanceCategory, FinanceMonthlyPlan, FinanceTransaction } from "./types";

export const financeAssistantMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(6000),
  })).min(1).max(16),
});

export const assistantCreateTransactionActionSchema = financeTransactionCreateSchema.extend({
  actionType: z.literal("create_transaction"),
});

export const assistantUpdateTransactionActionSchema = financeTransactionCreateSchema.partial().extend({
  actionType: z.literal("update_transaction"),
  transactionId: z.string().uuid(),
});

export const assistantDeleteTransactionActionSchema = z.object({
  actionType: z.literal("delete_transaction"),
  transactionId: z.string().uuid(),
});

export const assistantCreateGoalActionSchema = z.object({
  actionType: z.literal("create_goal"),
  name: z.string().trim().min(1).max(160),
  targetAmount: z.string().trim().regex(/^\\d+(?:\\.\\d{1,2})?$/),
  currentAmount: z.string().trim().regex(/^\\d+(?:\\.\\d{1,2})?$/).default("0.00"),
  monthlyContribution: z.string().trim().regex(/^\\d+(?:\\.\\d{1,2})?$/).default("0.00"),
  targetDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).nullable().optional(),
});

export const assistantUpdateBudgetActionSchema = z.object({
  actionType: z.literal("update_budget_category"),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  categoryId: z.string().uuid(),
  plannedAmount: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/),
});

export const assistantActionPayloadSchema = z.discriminatedUnion("actionType", [
  assistantCreateTransactionActionSchema,
  assistantUpdateTransactionActionSchema,
  assistantDeleteTransactionActionSchema,
  assistantCreateGoalActionSchema,
  assistantUpdateBudgetActionSchema,
]);

export const assistantResponseSchema = z.object({
  message: z.string().trim().min(1).max(5000),
  proposedActions: z.array(assistantActionPayloadSchema).max(3).default([]),
});

export type AssistantActionPayload = z.infer<typeof assistantActionPayloadSchema>;

export type FinanceAssistantContext = {
  month: string;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  plan: FinanceMonthlyPlan | null;
  budgetLines: FinanceBudgetLine[];
};

export function buildAssistantSnapshot(context: FinanceAssistantContext) {
  const summary = summarizeFinance({ transactions: context.transactions, plan: context.plan, budgetLines: context.budgetLines });
  const budgetByCategory = new Map(context.budgetLines.map((line) => [line.category_id, parseMoneyToCents(line.planned_amount)]));
  const expensesByCategory = new Map<string, number>();
  for (const transaction of context.transactions) {
    if (transaction.transaction_type !== "expense" || !transaction.category_id) continue;
    expensesByCategory.set(transaction.category_id, (expensesByCategory.get(transaction.category_id) ?? 0) + parseMoneyToCents(transaction.amount));
  }
  return {
    currency: "ZAR",
    month: context.month,
    summary: {
      income: formatCurrency(summary.incomeCents),
      expenses: formatCurrency(summary.expenseCents),
      net: formatCurrency(summary.netCents),
      plannedIncome: formatCurrency(summary.plannedIncomeCents),
      plannedExpenses: formatCurrency(summary.plannedExpenseCents),
      plannedSavings: formatCurrency(summary.plannedSavingsCents),
      remainingAfterSavings: formatCurrency(summary.remainingSpendableCents),
    },
    accounts: context.accounts.map((account) => ({ id: account.id, name: account.name, type: account.account_type, currency: account.currency, maskedIdentifier: account.masked_identifier })),
    categories: context.categories.map((category) => ({ id: category.id, name: category.name, group: category.group_name, defaultTransactionType: category.default_transaction_type, planned: formatCurrency(budgetByCategory.get(category.id) ?? 0), actual: formatCurrency(expensesByCategory.get(category.id) ?? 0) })),
    recentTransactions: context.transactions.slice(0, 40).map((transaction) => ({ id: transaction.id, date: transaction.transaction_date, description: transaction.description, merchant: transaction.normalized_merchant, amount: formatCurrency(parseMoneyToCents(transaction.amount)), type: transaction.transaction_type, categoryId: transaction.category_id })),
  };
}

export function systemPromptForFinanceAssistant() {
  return [
    "You are the Finance assistant inside Memory OS.",
    "The user currency is South African rand (ZAR).",
    "Be direct, practical, numerate, and evidence-based.",
    "Use only the provided finance snapshot for calculations and claims.",
    "If the data is incomplete, say so clearly.",
    "Do not insult the user. Do not pretend an action was completed.",
    "Return only JSON with keys message and proposedActions.",
    "Allowed proposedActions: create_transaction, update_transaction, delete_transaction, create_goal, or update_budget_category.",
    "Only propose an action when the user clearly asks to change data. For writes, say confirmation is required. For read-only questions, proposedActions must be [].",
  ].join("\n");
}

export function normalizeAssistantAction(action: AssistantActionPayload, context: FinanceAssistantContext) {
  if (action.actionType === "create_transaction") {
    const parsed = assistantCreateTransactionActionSchema.parse({ ...action, amount: normalizeMoneyInput(action.amount) });
    const account = context.accounts.find((item) => item.id === parsed.accountId);
    if (!account) throw new Error("The selected account does not exist.");
    const category = parsed.categoryId ? context.categories.find((item) => item.id === parsed.categoryId) : null;
    if (parsed.categoryId && !category) throw new Error("The selected category does not exist.");
    return {
      actionType: "create_transaction" as const,
      summary: "Create " + parsed.transactionType + " transaction for " + formatCurrency(parseMoneyToCents(parsed.amount)) + ": " + parsed.description,
      payload: parsed,
    };
  }
  if (action.actionType === "update_transaction") {
    const existing = context.transactions.find((item) => item.id === action.transactionId);
    if (!existing) throw new Error("The selected transaction does not exist.");
    const parsed = assistantUpdateTransactionActionSchema.parse(action);
    return { actionType: "update_transaction" as const, summary: "Update transaction: " + existing.description, payload: parsed };
  }
  if (action.actionType === "delete_transaction") {
    const existing = context.transactions.find((item) => item.id === action.transactionId);
    if (!existing) throw new Error("The selected transaction does not exist.");
    return { actionType: "delete_transaction" as const, summary: "Delete transaction: " + existing.description, payload: action };
  }
  if (action.actionType === "create_goal") {
    const parsed = assistantCreateGoalActionSchema.parse({ ...action, targetAmount: normalizeMoneyInput(action.targetAmount), currentAmount: normalizeMoneyInput(action.currentAmount), monthlyContribution: normalizeMoneyInput(action.monthlyContribution) });
    return { actionType: "create_goal" as const, summary: "Create goal " + parsed.name + " for " + formatCurrency(parseMoneyToCents(parsed.targetAmount)), payload: parsed };
  }
  const parsed = assistantUpdateBudgetActionSchema.parse({ ...action, plannedAmount: normalizeMoneyInput(action.plannedAmount) });
  const category = context.categories.find((item) => item.id === parsed.categoryId);
  if (!category) throw new Error("The selected category does not exist.");
  return {
    actionType: "update_budget_category" as const,
    summary: "Set " + category.name + " budget for " + parsed.month + " to " + formatCurrency(parseMoneyToCents(parsed.plannedAmount)),
    payload: parsed,
  };
}

export function transactionInsertPayload(action: Extract<AssistantActionPayload, { actionType: "create_transaction" }>) {
  return {
    owner_id: "owner",
    account_id: action.accountId,
    transaction_date: action.transactionDate,
    posted_date: action.postedDate || null,
    financial_month: financeMonthFromDate(action.transactionDate),
    description: action.description,
    normalized_merchant: action.normalizedMerchant || null,
    amount: normalizeMoneyInput(action.amount),
    transaction_type: action.transactionType,
    category_id: action.categoryId || null,
    source: "ai",
    source_reference: null,
    duplicate_fingerprint: buildTransactionFingerprint({ accountId: action.accountId, transactionDate: action.transactionDate, amount: action.amount, transactionType: action.transactionType, description: action.description, source: "ai" }),
    notes: action.notes || null,
  };
}

export function monthlyPlanPayloadForBudget(context: FinanceAssistantContext, action: Extract<AssistantActionPayload, { actionType: "update_budget_category" }>) {
  return financeMonthlyPlanSchema.parse({
    month: action.month,
    currency: "ZAR",
    expectedIncome: normalizeMoneyInput(context.plan?.expected_income ?? 0),
    savingsTarget: normalizeMoneyInput(context.plan?.savings_target ?? 0),
    notes: context.plan?.notes ?? null,
    budgetLines: [
      ...context.budgetLines.filter((line) => line.category_id !== action.categoryId).map((line) => ({ categoryId: line.category_id, plannedAmount: normalizeMoneyInput(line.planned_amount) })),
      { categoryId: action.categoryId, plannedAmount: normalizeMoneyInput(action.plannedAmount) },
    ],
  });
}
