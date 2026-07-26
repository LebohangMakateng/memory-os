export type FinanceAccount = {
  id: string;
  owner_id: string;
  name: string;
  account_type: string;
  currency: string;
  masked_identifier: string | null;
  opening_balance: string | number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FinanceCategory = {
  id: string;
  owner_id: string;
  name: string;
  group_name: string;
  default_transaction_type: string;
  sort_order: number;
  is_active: boolean;
};

export type FinanceTransaction = {
  id: string;
  owner_id: string;
  account_id: string;
  transaction_date: string;
  posted_date: string | null;
  financial_month: string;
  description: string;
  normalized_merchant: string | null;
  amount: string | number;
  transaction_type: "income" | "expense" | "transfer" | "adjustment";
  category_id: string | null;
  source: string;
  source_reference: string | null;
  duplicate_fingerprint: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceMonthlyPlan = {
  id: string;
  owner_id: string;
  month: string;
  currency: string;
  expected_income: string | number;
  savings_target: string | number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceBudgetLine = {
  id: string;
  plan_id: string;
  category_id: string;
  planned_amount: string | number;
};
