CREATE TABLE "weekly_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "week_label" varchar(80) NOT NULL,
  "focus" text NOT NULL,
  "focus_bullets" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "main_build" text NOT NULL,
  "definition_of_done" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "weekly_targets" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "daily_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "outreach_tracker" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "fear_check" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
