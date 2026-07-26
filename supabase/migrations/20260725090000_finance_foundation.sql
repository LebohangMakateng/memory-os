CREATE TABLE "finance_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "name" varchar(120) NOT NULL,
  "account_type" varchar(30) DEFAULT 'bank' NOT NULL,
  "currency" char(3) DEFAULT 'ZAR' NOT NULL,
  "masked_identifier" varchar(40),
  "opening_balance" numeric(14,2) DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "name" varchar(80) NOT NULL,
  "group_name" varchar(40) NOT NULL,
  "default_transaction_type" varchar(20) DEFAULT 'expense' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_monthly_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "month" char(7) NOT NULL,
  "currency" char(3) DEFAULT 'ZAR' NOT NULL,
  "expected_income" numeric(14,2) DEFAULT 0 NOT NULL,
  "savings_target" numeric(14,2) DEFAULT 0 NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "finance_monthly_plans_owner_month_unique" UNIQUE ("owner_id", "month")
);
--> statement-breakpoint
CREATE TABLE "finance_budget_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "planned_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "finance_budget_lines_plan_category_unique" UNIQUE ("plan_id", "category_id")
);
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "account_id" uuid NOT NULL,
  "transaction_date" date NOT NULL,
  "posted_date" date,
  "financial_month" char(7) NOT NULL,
  "description" text NOT NULL,
  "normalized_merchant" varchar(160),
  "amount" numeric(14,2) NOT NULL,
  "transaction_type" varchar(20) NOT NULL,
  "category_id" uuid,
  "source" varchar(20) DEFAULT 'manual' NOT NULL,
  "source_reference" text,
  "duplicate_fingerprint" varchar(160) NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "finance_transactions_fingerprint_unique" UNIQUE ("owner_id", "duplicate_fingerprint")
);
--> statement-breakpoint
ALTER TABLE "finance_budget_lines" ADD CONSTRAINT "finance_budget_lines_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."finance_monthly_plans"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "finance_budget_lines" ADD CONSTRAINT "finance_budget_lines_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "finance_transactions_owner_month_idx" ON "finance_transactions" ("owner_id", "financial_month");
--> statement-breakpoint
CREATE INDEX "finance_transactions_owner_date_idx" ON "finance_transactions" ("owner_id", "transaction_date");
--> statement-breakpoint
CREATE INDEX "finance_budget_lines_plan_idx" ON "finance_budget_lines" ("plan_id");
--> statement-breakpoint
INSERT INTO "finance_categories" ("name", "group_name", "default_transaction_type", "sort_order") VALUES
  ('Salary', 'financial', 'income', 10),
  ('Rent / Housing', 'essential', 'expense', 20),
  ('Groceries', 'essential', 'expense', 30),
  ('Utilities', 'essential', 'expense', 40),
  ('Transport', 'essential', 'expense', 50),
  ('Medical', 'essential', 'expense', 60),
  ('Insurance', 'essential', 'expense', 70),
  ('Restaurants', 'lifestyle', 'expense', 80),
  ('Takeout', 'lifestyle', 'expense', 90),
  ('Entertainment', 'lifestyle', 'expense', 100),
  ('Shopping', 'lifestyle', 'expense', 110),
  ('Travel', 'lifestyle', 'expense', 120),
  ('Fitness', 'lifestyle', 'expense', 130),
  ('Savings', 'financial', 'expense', 140),
  ('Investments', 'financial', 'expense', 150),
  ('Debt repayment', 'financial', 'expense', 160),
  ('Fees', 'financial', 'expense', 170),
  ('Transfers', 'financial', 'transfer', 180);
