import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { planningProposalSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

export async function POST(_request: Request, context: RouteContext<"/api/execution/plan-drafts/[draftId]/approve">) {
  await requireSession();
  const { draftId } = await context.params;
  const supabase = getSupabaseAdmin();
  const draft = await supabase.from("ai_planning_drafts").select("*").eq("id", draftId).single();
  if (draft.error) return Response.json({ error: draft.error.message }, { status: draft.error.code === "PGRST116" ? 404 : 500 });
  if (draft.data.status !== "pending_review") return Response.json({ error: "This draft has already been reviewed." }, { status: 409 });

  const proposal = planningProposalSchema.parse(draft.data.proposal);
  for (const proposedMilestone of proposal.milestones) {
    const milestone = await supabase.from("milestones").insert({
      project_id: draft.data.target_id,
      title: proposedMilestone.title,
      outcome: proposedMilestone.outcome,
    }).select("*").single();
    if (milestone.error) return Response.json({ error: milestone.error.message }, { status: 500 });

    const taskResult = await supabase.from("tasks").insert(proposedMilestone.tasks.map((task) => ({
      milestone_id: milestone.data.id,
      title: task.title,
      next_action: task.nextAction,
      reason: task.reason,
      expected_outcome: task.expectedOutcome,
      estimate_minutes: task.estimateMinutes,
      difficulty: 3,
      energy: task.energy,
      focus_type: task.focusType,
      impact: task.impact,
      share_status: task.shareRecommendation ? "planned" : "not_applicable",
    })));
    if (taskResult.error) return Response.json({ error: taskResult.error.message }, { status: 500 });
  }

  const update = await supabase.from("ai_planning_drafts").update({ status: "approved", updated_at: nowIso() }).eq("id", draft.data.id);
  if (update.error) return Response.json({ error: update.error.message }, { status: 500 });
  return Response.json({ ok: true });
}