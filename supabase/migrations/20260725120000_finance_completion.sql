CREATE TABLE "finance_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "currency" char(3) DEFAULT 'ZAR' NOT NULL,
  "payday_day" integer,
  "risk_tolerance" varchar(30) DEFAULT 'moderate' NOT NULL,
  "strict_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "assistant_tone" varchar(30) DEFAULT 'direct' NOT NULL,
  "savings_priority" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "finance_preferences_owner_unique" UNIQUE ("owner_id")
);
--> statement-breakpoint
CREATE TABLE "finance_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "entity_type" varchar(80) NOT NULL,
  "entity_id" uuid,
  "action" varchar(40) NOT NULL,
  "source" varchar(30) DEFAULT 'manual' NOT NULL,
  "before" jsonb,
  "after" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "finance_audit_events_owner_created_idx" ON "finance_audit_events" ("owner_id", "created_at");
--> statement-breakpoint
ALTER TABLE "finance_ai_actions" ADD COLUMN IF NOT EXISTS "confirmed_by" varchar(80);
