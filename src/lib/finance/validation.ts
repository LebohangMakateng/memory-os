import { z } from "zod";

const moneyString = z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, "Use a positive rand amount with up to two decimals.");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const monthString = z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM.");

export const financeAccountCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  accountType: z.enum(["bank", "cash", "credit", "savings", "investment", "other"]).default("bank"),
  currency: z.literal("ZAR").default("ZAR"),
  maskedIdentifier: z.string().trim().max(40).nullable().optional(),
  openingBalance: moneyString.default("0.00"),
});

export const financeTransactionCreateSchema = z.object({
  accountId: z.string().uuid(),
  transactionDate: dateString,
  postedDate: dateString.nullable().optional(),
  description: z.string().trim().min(1).max(1000),
  normalizedMerchant: z.string().trim().max(160).nullable().optional(),
  amount: moneyString,
  transactionType: z.enum(["income", "expense", "transfer", "adjustment"]),
  categoryId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const financeTransactionUpdateSchema = financeTransactionCreateSchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const financeMonthlyPlanSchema = z.object({
  month: monthString,
  currency: z.literal("ZAR").default("ZAR"),
  expectedIncome: moneyString.default("0.00"),
  savingsTarget: moneyString.default("0.00"),
  notes: z.string().trim().max(4000).nullable().optional(),
  budgetLines: z.array(z.object({ categoryId: z.string().uuid(), plannedAmount: moneyString.default("0.00") })).max(100).default([]),
});


export const financeGoalSchema = z.object({
  name: z.string().trim().min(1).max(160),
  goalType: z.enum(["savings", "emergency_fund", "travel", "investment", "debt_payoff", "large_purchase"]).default("savings"),
  targetAmount: moneyString,
  currentAmount: moneyString.default("0.00"),
  targetDate: dateString.nullable().optional(),
  monthlyContribution: moneyString.default("0.00"),
  priority: z.number().int().min(1).max(5).default(3),
});

export const financeRecurringExpenseSchema = z.object({
  name: z.string().trim().min(1).max(160),
  merchant: z.string().trim().max(160).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  amount: moneyString,
  frequency: z.enum(["weekly", "monthly", "quarterly", "annual"]).default("monthly"),
  nextDueDate: dateString.nullable().optional(),
});

export const financeCommitmentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  amount: moneyString,
  dueDate: dateString,
  categoryId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const financeNetWorthSchema = z.object({
  snapshotDate: dateString,
  cashAmount: moneyString.default("0.00"),
  investmentAmount: moneyString.default("0.00"),
  assetAmount: moneyString.default("0.00"),
  debtAmount: moneyString.default("0.00"),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const statementPreviewSchema = z.object({
  accountId: z.string().uuid(),
  sourceName: z.string().trim().min(1).max(160).default("Manual statement paste"),
  text: z.string().trim().min(1).max(200000),
});

export const statementImportSchema = z.object({
  importId: z.string().uuid(),
  rows: z.array(z.object({
    id: z.string().uuid(),
    categoryId: z.string().uuid().nullable().optional(),
    normalizedMerchant: z.string().trim().max(160).nullable().optional(),
    excluded: z.boolean().default(false),
  })).max(500),
});


export const financePreferencesSchema = z.object({
  paydayDay: z.number().int().min(1).max(31).nullable().optional(),
  riskTolerance: z.enum(["low", "moderate", "high"]).default("moderate"),
  strictCategories: z.array(z.string().uuid()).max(50).default([]),
  assistantTone: z.enum(["direct", "gentle", "strict"]).default("direct"),
  savingsPriority: z.string().trim().max(1000).nullable().optional(),
});

export const financeScenarioSchema = z.object({
  incomeDelta: moneyString.default("0.00"),
  expenseDelta: moneyString.default("0.00"),
  savingsDelta: moneyString.default("0.00"),
});
