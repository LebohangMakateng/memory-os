import { z } from "zod";

export const impactSchema = z.object({
  revenue: z.number().int().min(0).max(5),
  learning: z.number().int().min(0).max(5),
  portfolio: z.number().int().min(0).max(5),
  automation: z.number().int().min(0).max(5),
  enjoyment: z.number().int().min(0).max(5),
});

export const opportunitySchema = z.object({
  title: z.string().trim().min(1).max(160),
  note: z.string().trim().max(4000).optional(),
});

export const taskStatusSchema = z.object({
  status: z.enum(["todo", "in_progress", "done", "blocked"]),
});

export const planningRequestSchema = z.object({
  projectId: z.string().uuid(),
  instructions: z.string().trim().max(4000).optional(),
});

export const planningProposalSchema = z.object({
  assumptions: z.array(z.string()),
  confidentialityNotes: z.array(z.string()),
  milestones: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    outcome: z.string().trim().min(1).max(4000),
    tasks: z.array(z.object({
      title: z.string().trim().min(1).max(160),
      nextAction: z.string().trim().min(1).max(4000),
      reason: z.string().trim().min(1).max(4000),
      expectedOutcome: z.string().trim().min(1).max(4000),
      estimateMinutes: z.number().int().min(15).max(480),
      energy: z.enum(["low", "medium", "high"]),
      focusType: z.enum(["revenue", "learning", "portfolio", "maintenance"]),
      impact: impactSchema,
      shareRecommendation: z.string().trim().max(1000),
    })).min(1),
  })).min(1),
});
