import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { weeklyPlanSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

type WeeklyPlanRow = {
  id: string;
  week_start: string;
  week_label: string;
  focus: string;
  focus_bullets: unknown;
  main_build: string;
  definition_of_done: unknown;
  weekly_targets: unknown;
  daily_log: unknown;
  outreach_tracker: unknown;
  rules: unknown;
  fear_check: unknown;
  created_at: string;
  updated_at: string;
};

function isDateOnly(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function toClientPlan(row: WeeklyPlanRow) {
  return {
    id: row.id,
    weekStart: row.week_start,
    weekLabel: row.week_label,
    focus: row.focus,
    focusBullets: row.focus_bullets,
    mainBuild: row.main_build,
    definitionOfDone: row.definition_of_done,
    weeklyTargets: row.weekly_targets,
    dailyLog: row.daily_log,
    outreachTracker: row.outreach_tracker,
    rules: row.rules,
    fearCheck: row.fear_check,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  await requireSession();
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const history = searchParams.get("history") === "1";
  const weekStart = searchParams.get("weekStart");
  const before = searchParams.get("before");

  if (history) {
    let query = supabase
      .from("weekly_plans")
      .select("*")
      .order("week_start", { ascending: false })
      .order("updated_at", { ascending: false });

    if (isDateOnly(before)) query = query.lt("week_start", before as string);

    const { data, error } = await query.returns<WeeklyPlanRow[]>();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json((data ?? []).map(toClientPlan));
  }

  if (!isDateOnly(weekStart)) return Response.json({ error: "A valid weekStart query parameter is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("week_start", weekStart as string)
    .maybeSingle<WeeklyPlanRow>();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ? toClientPlan(data) : null);
}

export async function POST(request: Request) {
  await requireSession();
  const parsed = weeklyPlanSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const plan = parsed.data;
  const supabase = getSupabaseAdmin();
  const payload = {
    week_start: plan.weekStart,
    week_label: plan.weekLabel,
    focus: plan.focus,
    focus_bullets: plan.focusBullets,
    main_build: plan.mainBuild,
    definition_of_done: plan.definitionOfDone,
    weekly_targets: plan.weeklyTargets,
    daily_log: plan.dailyLog,
    outreach_tracker: plan.outreachTracker,
    rules: plan.rules,
    fear_check: plan.fearCheck,
    updated_at: nowIso(),
  };

  const query = plan.id
    ? supabase.from("weekly_plans").update(payload).eq("id", plan.id).select("*").single<WeeklyPlanRow>()
    : supabase.from("weekly_plans").upsert(payload, { onConflict: "week_start" }).select("*").single<WeeklyPlanRow>();

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(toClientPlan(data), { status: plan.id ? 200 : 201 });
}