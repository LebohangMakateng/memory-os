import type {
  EnergyLevel,
  ExecutionContext,
  ImpactScore,
  TaskCandidate,
  TaskRecommendation,
} from "@/lib/execution/types";

const energyRank: Record<EnergyLevel, number> = { low: 1, medium: 2, high: 3 };

export function impactTotal(impact: ImpactScore) {
  return Object.values(impact).reduce((total, score) => total + score, 0);
}

function daysUntil(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

export function recommendNextTask(
  tasks: TaskCandidate[],
  context: ExecutionContext,
): TaskRecommendation | null {
  const now = context.now ?? new Date();
  const eligible = tasks.filter(
    (task) =>
      task.status !== "done" &&
      task.status !== "blocked" &&
      task.estimateMinutes <= context.availableMinutes &&
      energyRank[task.energy] <= energyRank[context.energy],
  );

  const ranked = eligible
    .map((task) => {
      const impact = impactTotal(task.impact) * 4;
      const weeklyCommitment = Math.max(0, 30 - (task.weeklyRank - 1) * 6);
      const focusMatch = context.focus === task.focusType ? 12 : 0;
      const shareBoost =
        task.shareStatus === "ready_to_share" ? 8 : task.shareStatus === "drafting" ? 4 : 0;
      const urgency = task.dueDate
        ? Math.max(0, 24 - Math.max(daysUntil(task.dueDate, now), 0) * 4)
        : 0;
      const score = impact + weeklyCommitment + focusMatch + shareBoost + urgency;
      return { task, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return null;

  const reasons = [
    `#${best.task.weeklyRank} weekly priority`,
    `${impactTotal(best.task.impact)}/25 impact`,
  ];
  if (context.focus === best.task.focusType) reasons.push(`matches your ${context.focus} focus`);
  if (best.task.shareStatus === "ready_to_share") reasons.push("is ready to share");

  return {
    ...best,
    explanation: `${reasons.join(", ")}. ${best.task.reason}`,
  };
}
