ALTER TABLE "weekly_plans" ADD COLUMN "week_start" date;

UPDATE "weekly_plans"
SET "week_start" = ("updated_at"::date - EXTRACT(DOW FROM "updated_at")::integer)
WHERE "week_start" IS NULL;

ALTER TABLE "weekly_plans" ALTER COLUMN "week_start" SET NOT NULL;
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_week_start_unique" UNIQUE ("week_start");