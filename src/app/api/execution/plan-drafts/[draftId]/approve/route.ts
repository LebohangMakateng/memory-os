import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { aiPlanningDrafts, milestones, tasks } from "@/lib/db/schema";
import { planningProposalSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

export async function POST(_request: Request, context: RouteContext<"/api/execution/plan-drafts/[draftId]/approve">) {
  await requireSession();
  if (!db) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const { draftId } = await context.params;
  const [draft] = await db.select().from(aiPlanningDrafts).where(eq(aiPlanningDrafts.id, draftId)).limit(1);
  if (!draft) return Response.json({ error: "Planning draft not found." }, { status: 404 });
  if (draft.status !== "pending_review") return Response.json({ error: "This draft has already been reviewed." }, { status: 409 });
  const proposal = planningProposalSchema.parse(draft.proposal);
  for (const proposedMilestone of proposal.milestones) {
    const [milestone] = await db.insert(milestones).values({ projectId: draft.targetId, title: proposedMilestone.title, outcome: proposedMilestone.outcome }).returning();
    await db.insert(tasks).values(proposedMilestone.tasks.map((task) => ({
      milestoneId: milestone.id,
      title: task.title,
      nextAction: task.nextAction,
      reason: task.reason,
      expectedOutcome: task.expectedOutcome,
      estimateMinutes: task.estimateMinutes,
      difficulty: 3,
      energy: task.energy,
      focusType: task.focusType,
      impact: task.impact,
      shareStatus: task.shareRecommendation ? "planned" : "not_applicable",
    })));
  }
  await db.update(aiPlanningDrafts).set({ status: "approved", updatedAt: new Date() }).where(eq(aiPlanningDrafts.id, draft.id));
  return Response.json({ ok: true });
}
