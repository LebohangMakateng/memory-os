import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { taskUpdateSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

function toTaskPatch(task: {
  milestoneId?: string;
  weeklyPriorityId?: string | null;
  title?: string;
  description?: string | null;
  nextAction?: string;
  reason?: string;
  expectedOutcome?: string;
  status?: string;
  dueDate?: string | null;
  estimateMinutes?: number;
  difficulty?: number;
  energy?: string;
  focusType?: string;
  impact?: unknown;
  shareStatus?: string;
  shareChannel?: string | null;
  shareUrl?: string | null;
}) {
  return {
    ...(task.milestoneId !== undefined ? { milestone_id: task.milestoneId } : {}),
    ...(task.weeklyPriorityId !== undefined ? { weekly_priority_id: task.weeklyPriorityId || null } : {}),
    ...(task.title !== undefined ? { title: task.title } : {}),
    ...(task.description !== undefined ? { description: task.description || null } : {}),
    ...(task.nextAction !== undefined ? { next_action: task.nextAction } : {}),
    ...(task.reason !== undefined ? { reason: task.reason } : {}),
    ...(task.expectedOutcome !== undefined ? { expected_outcome: task.expectedOutcome } : {}),
    ...(task.status !== undefined ? { status: task.status } : {}),
    ...(task.dueDate !== undefined ? { due_date: task.dueDate || null } : {}),
    ...(task.estimateMinutes !== undefined ? { estimate_minutes: task.estimateMinutes } : {}),
    ...(task.difficulty !== undefined ? { difficulty: task.difficulty } : {}),
    ...(task.energy !== undefined ? { energy: task.energy } : {}),
    ...(task.focusType !== undefined ? { focus_type: task.focusType } : {}),
    ...(task.impact !== undefined ? { impact: task.impact } : {}),
    ...(task.shareStatus !== undefined ? { share_status: task.shareStatus } : {}),
    ...(task.shareChannel !== undefined ? { share_channel: task.shareChannel || null } : {}),
    ...(task.shareUrl !== undefined ? { share_url: task.shareUrl || null } : {}),
    updated_at: nowIso(),
  };
}

export async function PATCH(request: Request, context: RouteContext<"/api/execution/tasks/[taskId]">) {
  await requireSession();
  const { taskId } = await context.params;
  const parsed = taskUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .update(toTaskPatch(parsed.data))
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  return Response.json(data);
}

export async function DELETE(_request: Request, context: RouteContext<"/api/execution/tasks/[taskId]">) {
  await requireSession();
  const { taskId } = await context.params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
