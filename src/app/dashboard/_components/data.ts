import type { ImpactScore, ShareStatus, TaskCandidate } from "@/lib/execution/types";
import type { getExecutionOverview } from "@/lib/execution/overview";

export type Overview = Awaited<ReturnType<typeof getExecutionOverview>>;
export type OverviewTask = Overview["tasks"][number];

export function asImpactScore(value: unknown): ImpactScore {
  const impact = value as Partial<ImpactScore> | null;
  return {
    revenue: Number(impact?.revenue ?? 0),
    learning: Number(impact?.learning ?? 0),
    portfolio: Number(impact?.portfolio ?? 0),
    automation: Number(impact?.automation ?? 0),
    enjoyment: Number(impact?.enjoyment ?? 0),
  };
}

export function taskCandidate(task: OverviewTask, weeklyRank: number): TaskCandidate {
  return {
    id: task.id,
    title: task.title,
    nextAction: task.nextAction,
    reason: task.reason,
    weeklyRank,
    dueDate: task.dueDate ?? undefined,
    estimateMinutes: task.estimateMinutes,
    energy: task.energy as TaskCandidate["energy"],
    focusType: task.focusType as TaskCandidate["focusType"],
    impact: asImpactScore(task.impact),
    shareStatus: task.shareStatus as ShareStatus,
    status: task.status as TaskCandidate["status"],
  };
}

export { formatDate, statusLabel } from "./format";

export async function loadOverview() {
  const { requireSession } = await import("@/lib/auth/session");
  const { getExecutionOverview } = await import("@/lib/execution/overview");
  await requireSession();
  try {
    return { overview: await getExecutionOverview(), error: null };
  } catch (error) {
    return { overview: null, error: error instanceof Error ? error.message : "Could not load execution overview." };
  }
}