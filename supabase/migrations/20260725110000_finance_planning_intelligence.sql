CREATE TABLE "finance_statement_imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "account_id" uuid NOT NULL,
  "source_name" varchar(160) NOT NULL,
  "statement_period_start" date,
  "statement_period_end" date,
  "status" varchar(30) DEFAULT 'preview' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_statement_import_rows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "import_id" uuid NOT NULL,
  "transaction_date" date NOT NULL,
  "description" text NOT NULL,
  "normalized_merchant" varchar(160),
  "amount" numeric(14,2) NOT NULL,
  "transaction_type" varchar(20) NOT NULL,
  "category_id" uuid,
  "duplicate_fingerprint" varchar(160) NOT NULL,
  "duplicate_status" varchar(30) DEFAULT 'new' NOT NULL,
  "confidence" numeric(5,2) DEFAULT 0.80 NOT NULL,
  "excluded" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "name" varchar(160) NOT NULL,
  "goal_type" varchar(40) DEFAULT 'savings' NOT NULL,
  "target_amount" numeric(14,2) NOT NULL,
  "current_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "target_date" date,
  "monthly_contribution" numeric(14,2) DEFAULT 0 NOT NULL,
  "priority" integer DEFAULT 3 NOT NULL,
  "status" varchar(20) DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_recurring_expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "name" varchar(160) NOT NULL,
  "merchant" varchar(160),
  "category_id" uuid,
  "amount" numeric(14,2) NOT NULL,
  "frequency" varchar(20) DEFAULT 'monthly' NOT NULL,
  "next_due_date" date,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_commitments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "name" varchar(160) NOT NULL,
  "amount" numeric(14,2) NOT NULL,
  "due_date" date NOT NULL,
  "category_id" uuid,
  "status" varchar(20) DEFAULT 'planned' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_net_worth_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "snapshot_date" date NOT NULL,
  "cash_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "investment_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "asset_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "debt_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finance_statement_imports" ADD CONSTRAINT "finance_statement_imports_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."finance_accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "finance_statement_import_rows" ADD CONSTRAINT "finance_statement_import_rows_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."finance_statement_imports"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "finance_statement_import_rows" ADD CONSTRAINT "finance_statement_import_rows_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "finance_recurring_expenses" ADD CONSTRAINT "finance_recurring_expenses_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "finance_commitments" ADD CONSTRAINT "finance_commitments_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."finance_categories"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "finance_statement_import_rows_import_idx" ON "finance_statement_import_rows" ("import_id");
--> statement-breakpoint
CREATE INDEX "finance_goals_owner_status_idx" ON "finance_goals" ("owner_id", "status");
--> statement-breakpoint
CREATE INDEX "finance_commitments_owner_due_idx" ON "finance_commitments" ("owner_id", "due_date");
