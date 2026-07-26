import assert from "node:assert/strict";
import test from "node:test";
import { buildTransactionFingerprint, centsToMoney, financeMonthFromDate, parseMoneyToCents, summarizeCategoryActuals, summarizeFinance } from "./calculations";
import type { FinanceTransaction } from "./types";

test("parses South African rand amounts without floating-point drift", () => {
  assert.equal(parseMoneyToCents("300"), 30000);
  assert.equal(parseMoneyToCents("300.05"), 30005);
  assert.equal(centsToMoney(30005), "300.05");
});

test("derives financial month from transaction date", () => {
  assert.equal(financeMonthFromDate("2026-07-25"), "2026-07");
});

test("summarizes income, expenses, budgets, and remaining spendable money", () => {
  const transactions = [
    { amount: "40000.00", transaction_type: "income", category_id: "salary" },
    { amount: "300.00", transaction_type: "expense", category_id: "transport" },
    { amount: "700.50", transaction_type: "expense", category_id: "groceries" },
  ] as FinanceTransaction[];
  const summary = summarizeFinance({ transactions, plan: { expected_income: "40000.00", savings_target: "5000.00" } as never, budgetLines: [{ planned_amount: "10000.00" } as never] });
  assert.equal(summary.incomeCents, 4000000);
  assert.equal(summary.expenseCents, 100050);
  assert.equal(summary.remainingSpendableCents, 3399950);
  assert.equal(summary.plannedRemainingCents, 2500000);
});

test("aggregates category expense totals only", () => {
  const totals = summarizeCategoryActuals([
    { amount: "100.00", transaction_type: "expense", category_id: "food" },
    { amount: "50.00", transaction_type: "income", category_id: "food" },
    { amount: "20.00", transaction_type: "expense", category_id: "food" },
  ] as FinanceTransaction[]);
  assert.equal(totals.get("food"), 12000);
});

test("builds stable duplicate fingerprints", () => {
  assert.equal(
    buildTransactionFingerprint({ accountId: "acc", transactionDate: "2026-07-25", amount: "300.0", transactionType: "expense", description: " Uber  Trip " }),
    buildTransactionFingerprint({ accountId: "acc", transactionDate: "2026-07-25", amount: "300.00", transactionType: "expense", description: "uber trip" }),
  );
});
