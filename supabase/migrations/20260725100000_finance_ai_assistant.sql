CREATE TABLE "finance_chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "role" varchar(20) NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_ai_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" varchar(80) DEFAULT 'owner' NOT NULL,
  "action_type" varchar(60) NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "summary" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "confirmed_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "result" jsonb
);
--> statement-breakpoint
CREATE INDEX "finance_chat_messages_owner_created_idx" ON "finance_chat_messages" ("owner_id", "created_at");
--> statement-breakpoint
CREATE INDEX "finance_ai_actions_owner_status_idx" ON "finance_ai_actions" ("owner_id", "status", "created_at");
