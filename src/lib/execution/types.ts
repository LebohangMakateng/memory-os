export const shareStatuses = [
  "not_applicable",
  "planned",
  "drafting",
  "ready_to_share",
  "shared",
] as const;

export type ShareStatus = (typeof shareStatuses)[number];

export type EnergyLevel = "low" | "medium" | "high";
export type FocusType = "revenue" | "learning" | "portfolio" | "maintenance";

export interface ImpactScore {
  revenue: number;
  learning: number;
  portfolio: number;
  automation: number;
  enjoyment: number;
}

export interface TaskCandidate {
  id: string;
  title: string;
  nextAction: string;
  reason: string;
  weeklyRank: number;
  dueDate?: Date;
  estimateMinutes: number;
  energy: EnergyLevel;
  focusType: FocusType;
  impact: ImpactScore;
  shareStatus: ShareStatus;
  status: "todo" | "in_progress" | "blocked" | "done";
}

export interface ExecutionContext {
  availableMinutes: number;
  energy: EnergyLevel;
  focus?: FocusType;
  now?: Date;
}

export interface TaskRecommendation {
  task: TaskCandidate;
  score: number;
  explanation: string;
}
