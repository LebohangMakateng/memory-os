import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { taskCreateSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

function toTaskPayload(task: {
  milestoneId: string;
  weeklyPriorityId?: string | null;
  title: string;
  description?: string | null;
  nextAction: string;
  reason: string;
  expectedOutcome: string;
  status: string;
  dueDate?: string | null;
  estimateMinutes: number;
  difficulty: number;
  energy: string;
  focusType: string;
  impact: unknown;
  shareStatus: string;
  shareChannel?: string | null;
  shareUrl?: string | null;
}) {
  return {
    milestone_id: task.milestoneId,
    weekly_priority_id: task.weeklyPriorityId || null,
    title: task.title,
    description: task.description || null,
    next_action: task.nextAction,
    reason: task.reason,
    expected_outcome: task.expectedOutcome,
    status: task.status,
    due_date: task.dueDate || null,
    estimate_minutes: task.estimateMinutes,
    difficulty: task.difficulty,
    energy: task.energy,
    focus_type: task.focusType,
    impact: task.impact,
    share_status: task.shareStatus,
    share_channel: task.shareChannel || null,
    share_url: task.shareUrl || null,
  };
}

export async function POST(request: Request) {
  await requireSession();
  const parsed = taskCreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .insert(toTaskPayload(parsed.data))
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
