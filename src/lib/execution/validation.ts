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

export const opportunityUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  note: z.string().trim().max(4000).nullable().optional(),
  status: z.enum(["inbox", "reviewed", "archived"]).optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required.");


export const projectStatusSchema = z.enum(["active", "paused", "archived"]);
export const projectShareStatusSchema = z.enum(["planned", "drafting", "ready_to_share", "shared", "not_applicable"]);

export const projectCreateSchema = z.object({
  initiativeId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  purpose: z.string().trim().min(1).max(4000),
  status: projectStatusSchema.default("active"),
  shareStatus: projectShareStatusSchema.default("planned"),
});

export const projectUpdateSchema = z.object({
  initiativeId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160).optional(),
  purpose: z.string().trim().min(1).max(4000).optional(),
  status: projectStatusSchema.optional(),
  shareStatus: projectShareStatusSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required.");

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

const weeklyTargetSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().max(1000),
  done: z.boolean(),
});

const dailyPlanSchema = z.object({
  day: z.string().trim().min(1).max(20),
  build: z.string().trim().max(4000),
  post: z.string().trim().max(4000),
  notes: z.string().trim().max(4000),
  shipped: z.string().trim().max(4000),
  messages: z.string().trim().max(1000),
  contacted: z.string().trim().max(4000),
  responses: z.string().trim().max(4000),
  review: z.string().trim().max(4000),
});

const outreachRowSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().trim().max(160),
  platform: z.string().trim().max(80),
  messageSent: z.string().trim().max(1000),
  response: z.string().trim().max(1000),
  followUp: z.string().trim().max(1000),
});

export const weeklyPlanSchema = z.object({
  id: z.string().uuid().optional(),
  weekLabel: z.string().trim().min(1).max(80),
  focus: z.string().trim().max(4000),
  focusBullets: z.array(z.string().trim().max(1000)).max(10),
  mainBuild: z.string().trim().max(4000),
  definitionOfDone: z.array(z.string().trim().max(1000)).max(20),
  weeklyTargets: z.array(weeklyTargetSchema).max(20),
  dailyLog: z.array(dailyPlanSchema).max(7),
  outreachTracker: z.array(outreachRowSchema).max(100),
  rules: z.array(z.string().trim().max(240)).max(20),
  fearCheck: z.object({
    avoiding: z.string().trim().max(4000),
    smallestAction: z.string().trim().max(4000),
  }),
});
