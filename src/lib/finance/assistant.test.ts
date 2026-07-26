import assert from "node:assert/strict";
import test from "node:test";
import { buildAssistantSnapshot, normalizeAssistantAction, transactionInsertPayload } from "./assistant";
import type { FinanceAssistantContext } from "./assistant";

const context = {
  month: "2026-07",
  accounts: [{ id: "11111111-1111-4111-8111-111111111111", owner_id: "owner", name: "Main", account_type: "bank", currency: "ZAR", masked_identifier: "****4831", opening_balance: "0.00", is_active: true, created_at: "", updated_at: "" }],
  categories: [{ id: "22222222-2222-4222-8222-222222222222", owner_id: "owner", name: "Transport", group_name: "essential", default_transaction_type: "expense", sort_order: 1, is_active: true }],
  transactions: [{ id: "tx", owner_id: "owner", account_id: "11111111-1111-4111-8111-111111111111", amount: "300.00", transaction_type: "expense", category_id: "22222222-2222-4222-8222-222222222222", transaction_date: "2026-07-25", posted_date: null, financial_month: "2026-07", description: "Uber", normalized_merchant: "Uber", source: "manual", source_reference: null, duplicate_fingerprint: "fp", notes: null, created_at: "", updated_at: "" }],
  plan: { id: "plan", owner_id: "owner", month: "2026-07", currency: "ZAR", expected_income: "40000.00", savings_target: "5000.00", notes: null, created_at: "", updated_at: "" },
  budgetLines: [{ id: "line", plan_id: "plan", category_id: "22222222-2222-4222-8222-222222222222", planned_amount: "1500.00" }],
} satisfies FinanceAssistantContext;

test("assistant snapshot scopes finance data and formats ZAR", () => {
  const snapshot = buildAssistantSnapshot(context);
  assert.equal(snapshot.currency, "ZAR");
  assert.equal(snapshot.summary.expenses.includes("R"), true);
  assert.equal(snapshot.recentTransactions.length, 1);
});

test("normalizes a pending AI transaction action without writing it", () => {
  const action = normalizeAssistantAction({
    actionType: "create_transaction",
    accountId: "11111111-1111-4111-8111-111111111111",
    transactionDate: "2026-07-25",
    description: "Uber trip",
    amount: "300",
    transactionType: "expense",
    categoryId: "22222222-2222-4222-8222-222222222222",
  }, context);
  assert.equal(action.actionType, "create_transaction");
  if (action.actionType !== "create_transaction") throw new Error("Expected transaction action.");
  assert.equal(action.payload.amount, "300.00");
  assert.match(action.summary, /Create expense transaction/);
});

test("confirmed AI transaction payload is auditable", () => {
  const payload = transactionInsertPayload({
    actionType: "create_transaction",
    accountId: "11111111-1111-4111-8111-111111111111",
    transactionDate: "2026-07-25",
    description: "Uber trip",
    amount: "300.00",
    transactionType: "expense",
    categoryId: "22222222-2222-4222-8222-222222222222",
  });
  assert.equal(payload.source, "ai");
  assert.equal(payload.amount, "300.00");
  assert.equal(payload.financial_month, "2026-07");
});
