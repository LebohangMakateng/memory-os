import { getSupabaseAdmin } from "@/lib/db/supabase";

type Row = Record<string, unknown>;

function required<T>(data: T | null, error: { message: string } | null) {
  if (error) throw new Error(error.message);
  return data;
}

function toDate(value: unknown) {
  return typeof value === "string" ? new Date(value) : null;
}

function mapTimestamps(row: Row) {
  return {
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

function mapVision(row: Row) {
  return {
    id: String(row.id),
    title: String(row.title),
    statement: String(row.statement),
    isActive: Boolean(row.is_active),
    ...mapTimestamps(row),
  };
}

function mapGoal(row: Row) {
  return {
    id: String(row.id),
    visionId: String(row.vision_id),
    title: String(row.title),
    description: String(row.description),
    horizon: String(row.horizon),
    successMetric: row.success_metric ? String(row.success_metric) : null,
    status: String(row.status),
    ...mapTimestamps(row),
  };
}

function mapInitiative(row: Row) {
  return {
    id: String(row.id),
    goalId: String(row.goal_id),
    title: String(row.title),
    why: String(row.why),
    successMetric: row.success_metric ? String(row.success_metric) : null,
    status: String(row.status),
    ...mapTimestamps(row),
  };
}

function mapProject(row: Row) {
  return {
    id: String(row.id),
    initiativeId: String(row.initiative_id),
    title: String(row.title),
    purpose: String(row.purpose),
    status: String(row.status),
    shareStatus: String(row.share_status),
    ...mapTimestamps(row),
  };
}

function mapMilestone(row: Row) {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title),
    outcome: String(row.outcome),
    status: String(row.status),
    targetDate: toDate(row.target_date),
    ...mapTimestamps(row),
  };
}

function mapWeek(row: Row) {
  return {
    id: String(row.id),
    startsOn: toDate(row.starts_on) ?? new Date(),
    reflection: row.reflection ? String(row.reflection) : null,
    ...mapTimestamps(row),
  };
}

function mapPriority(row: Row) {
  return {
    id: String(row.id),
    weekId: String(row.week_id),
    projectId: row.project_id ? String(row.project_id) : null,
    title: String(row.title),
    rank: Number(row.rank),
    ...mapTimestamps(row),
  };
}

function mapTask(row: Row) {
  return {
    id: String(row.id),
    milestoneId: String(row.milestone_id),
    weeklyPriorityId: row.weekly_priority_id ? String(row.weekly_priority_id) : null,
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    nextAction: String(row.next_action),
    reason: String(row.reason),
    expectedOutcome: String(row.expected_outcome),
    status: String(row.status),
    dueDate: toDate(row.due_date),
    estimateMinutes: Number(row.estimate_minutes),
    difficulty: Number(row.difficulty),
    energy: String(row.energy),
    focusType: String(row.focus_type),
    impact: row.impact,
    shareStatus: String(row.share_status),
    shareChannel: row.share_channel ? String(row.share_channel) : null,
    shareUrl: row.share_url ? String(row.share_url) : null,
    ...mapTimestamps(row),
  };
}

function mapOpportunity(row: Row) {
  return {
    id: String(row.id),
    title: String(row.title),
    note: row.note ? String(row.note) : null,
    status: String(row.status),
    reviewedAt: toDate(row.reviewed_at),
    ...mapTimestamps(row),
  };
}

function mapDraft(row: Row) {
  return {
    id: String(row.id),
    targetType: String(row.target_type),
    targetId: String(row.target_id),
    prompt: row.prompt ? String(row.prompt) : null,
    proposal: row.proposal,
    status: String(row.status),
    ...mapTimestamps(row),
  };
}

export async function getExecutionOverview() {
  const supabase = getSupabaseAdmin();
  const [visions, goals, initiatives, projects, milestones, weeks, priorities, tasks, opportunities, planningDrafts] = await Promise.all([
    supabase.from("visions").select("*").eq("is_active", true),
    supabase.from("goals").select("*").eq("status", "active"),
    supabase.from("initiatives").select("*").eq("status", "active"),
    supabase.from("projects").select("*").eq("status", "active"),
    supabase.from("milestones").select("*").eq("status", "planned"),
    supabase.from("weeks").select("*").order("starts_on", { ascending: false }).limit(1),
    supabase.from("weekly_priorities").select("*").order("rank", { ascending: true }),
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("opportunities").select("*").eq("status", "inbox").order("created_at", { ascending: false }),
    supabase.from("ai_planning_drafts").select("*").eq("status", "pending_review").order("created_at", { ascending: false }),
  ]);

  const weekRows = required(weeks.data, weeks.error) ?? [];
  const activeWeek = weekRows[0] ? mapWeek(weekRows[0]) : null;

  return {
    vision: (required(visions.data, visions.error) ?? []).map(mapVision)[0] ?? null,
    goals: (required(goals.data, goals.error) ?? []).map(mapGoal),
    initiatives: (required(initiatives.data, initiatives.error) ?? []).map(mapInitiative),
    projects: (required(projects.data, projects.error) ?? []).map(mapProject),
    milestones: (required(milestones.data, milestones.error) ?? []).map(mapMilestone),
    week: activeWeek,
    priorities: activeWeek ? (required(priorities.data, priorities.error) ?? []).map(mapPriority).filter((priority) => priority.weekId === activeWeek.id) : [],
    tasks: (required(tasks.data, tasks.error) ?? []).map(mapTask),
    opportunities: (required(opportunities.data, opportunities.error) ?? []).map(mapOpportunity),
    planningDrafts: (required(planningDrafts.data, planningDrafts.error) ?? []).map(mapDraft),
  };
}