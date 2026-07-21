import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { taskCreateSchema, weeklyPlanSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(6000),
});

const weeklyContextSchema = z.object({
  milestones: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    outcome: z.string().nullable().optional(),
  })).max(100),
  priorities: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    projectId: z.string().uuid().nullable().optional(),
    rank: z.number().int(),
  })).max(20),
  tasks: z.array(z.object({
    id: z.string().uuid(),
    milestoneId: z.string().uuid(),
    weeklyPriorityId: z.string().uuid().nullable(),
    title: z.string(),
    nextAction: z.string(),
    status: z.string(),
  })).max(200),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
  currentPlan: weeklyPlanSchema,
  weekStart: z.string().date(),
  weekLabel: z.string().trim().min(1).max(80),
  context: weeklyContextSchema,
});

const looseDashboardDraftSchema = weeklyPlanSchema
  .omit({ id: true, weekStart: true, weekLabel: true })
  .extend({
    tasksToCreate: z.array(z.unknown()).default([]),
    notes: z.string().trim().max(2000).optional(),
  });

const readyResponseSchema = z.object({
  status: z.literal("ready"),
  message: z.string().trim().min(1).max(4000),
  draft: looseDashboardDraftSchema,
});

const clarificationResponseSchema = z.object({
  status: z.literal("needs_clarification"),
  message: z.string().trim().min(1).max(4000),
  questions: z.array(z.string().trim().min(1).max(600)).min(1).max(6),
});

type WeeklyContext = z.infer<typeof weeklyContextSchema>;
type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as LooseRecord : {};
}

function asString(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeEnergy(value: unknown) {
  const energy = asString(value).toLowerCase();
  return ["low", "medium", "high"].includes(energy) ? energy : "medium";
}

function normalizeFocusType(value: unknown) {
  const focus = asString(value).toLowerCase();
  if (["revenue", "learning", "portfolio", "maintenance"].includes(focus)) return focus;
  if (["sales", "outreach", "pipeline", "lead generation"].includes(focus)) return "revenue";
  if (["content", "creative", "marketing", "brand", "visibility", "proof", "shipping"].includes(focus)) return "portfolio";
  return "maintenance";
}

function normalizeStatus(value: unknown) {
  const status = asString(value).toLowerCase().replaceAll(" ", "_");
  return ["todo", "in_progress", "done", "blocked"].includes(status) ? status : "todo";
}

function normalizeShareStatus(value: unknown) {
  const status = asString(value).toLowerCase().replaceAll(" ", "_");
  return ["planned", "drafting", "ready_to_share", "shared", "not_applicable"].includes(status) ? status : "planned";
}

function normalizeImpact(value: unknown) {
  const impact = asRecord(value);
  return {
    revenue: Math.max(0, Math.min(5, Math.round(asNumber(impact.revenue, 3)))),
    learning: Math.max(0, Math.min(5, Math.round(asNumber(impact.learning, 3)))),
    portfolio: Math.max(0, Math.min(5, Math.round(asNumber(impact.portfolio, 3)))),
    automation: Math.max(0, Math.min(5, Math.round(asNumber(impact.automation, 2)))),
    enjoyment: Math.max(0, Math.min(5, Math.round(asNumber(impact.enjoyment, 3)))),
  };
}

function findMilestoneId(task: LooseRecord, context: WeeklyContext) {
  const explicit = asString(task.milestoneId ?? task.milestone_id);
  if (context.milestones.some((milestone) => milestone.id === explicit)) return explicit;
  const title = asString(task.milestoneTitle ?? task.milestone ?? task.project ?? task.area).toLowerCase();
  const match = context.milestones.find((milestone) => milestone.title.toLowerCase() === title || milestone.title.toLowerCase().includes(title));
  return match?.id ?? context.milestones[0]?.id ?? "";
}

function findPriorityId(task: LooseRecord, context: WeeklyContext) {
  const explicit = asString(task.weeklyPriorityId ?? task.weekly_priority_id);
  if (context.priorities.some((priority) => priority.id === explicit)) return explicit;
  const title = asString(task.weeklyPriorityTitle ?? task.priority ?? task.weeklyPriority).toLowerCase();
  const match = title ? context.priorities.find((priority) => priority.title.toLowerCase() === title || priority.title.toLowerCase().includes(title)) : null;
  return match?.id ?? null;
}

function normalizeTask(value: unknown, context: WeeklyContext) {
  const task = asRecord(value);
  const title = asString(task.title ?? task.name ?? task.task, "Untitled task");
  const nextAction = asString(task.nextAction ?? task.next_action ?? task.action ?? task.next ?? task.description, title);
  const expectedOutcome = asString(task.expectedOutcome ?? task.expected_outcome ?? task.outcome ?? task.result, `Complete ${title}.`);
  const milestoneId = findMilestoneId(task, context);
  if (!milestoneId) return null;

  return taskCreateSchema.parse({
    milestoneId,
    weeklyPriorityId: findPriorityId(task, context),
    title,
    description: asString(task.description ?? task.note, "") || null,
    nextAction,
    reason: asString(task.reason ?? task.why, `This supports the weekly focus: ${title}.`),
    expectedOutcome,
    status: normalizeStatus(task.status),
    dueDate: asString(task.dueDate ?? task.due_date) || null,
    estimateMinutes: Math.max(15, Math.min(480, Math.round(asNumber(task.estimateMinutes ?? task.estimate_minutes ?? task.estimate ?? task.minutes, 45) / 15) * 15)),
    difficulty: Math.max(1, Math.min(5, Math.round(asNumber(task.difficulty, 3)))),
    energy: normalizeEnergy(task.energy),
    focusType: normalizeFocusType(task.focusType ?? task.focus_type ?? task.focus),
    impact: normalizeImpact(task.impact),
    shareStatus: normalizeShareStatus(task.shareStatus ?? task.share_status),
    shareChannel: asString(task.shareChannel ?? task.share_channel) || null,
    shareUrl: asString(task.shareUrl ?? task.share_url) || null,
  });
}

function normalizeReadyResponse(value: unknown, context: WeeklyContext) {
  const ready = readyResponseSchema.parse(value);
  const tasksToCreate = ready.draft.tasksToCreate
    .map((task) => normalizeTask(task, context))
    .filter((task): task is z.infer<typeof taskCreateSchema> => Boolean(task));
  return { ...ready, draft: { ...ready.draft, tasksToCreate } };
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Claude did not return a JSON object.");
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

function allowedIdsSummary(context: WeeklyContext) {
  return {
    milestones: context.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, outcome: milestone.outcome ?? "" })),
    weeklyPriorities: context.priorities.map((priority) => ({ id: priority.id, rank: priority.rank, title: priority.title })),
    existingTasks: context.tasks.map((task) => ({ id: task.id, title: task.title, status: task.status, milestoneId: task.milestoneId, weeklyPriorityId: task.weeklyPriorityId })),
  };
}

function parseAiResponse(value: unknown, context: WeeklyContext) {
  const root = asRecord(value);
  return root.status === "ready" ? normalizeReadyResponse(value, context) : clarificationResponseSchema.parse(value);
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return issue ? `Claude returned an incomplete weekly plan at ${issue.path.join(".") || "root"}: ${issue.message}` : "Claude returned an invalid weekly plan response.";
  }
  return error instanceof Error ? error.message : "Claude returned an invalid weekly plan response.";
}

export async function POST(request: Request) {
  await requireSession();
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });

  const { messages, currentPlan, weekStart, weekLabel, context } = parsed.data;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = `You are the weekly planning assistant for a personal Execution OS. The permanent operating principle is "Share everything I build." The user will describe the week in natural language. Ask detailed clarification questions until the intent is specific enough to plan the week; do not guess from vague input. Return needs_clarification when goals, priorities, scope, constraints, available time, deadlines, success criteria, or task details are missing or ambiguous. Ask targeted questions that would materially improve the plan, then wait for the user's answers before returning a ready draft. When ready, return a weekly dashboard draft and additive weekly tasks only. Do not claim work is completed. Respect confidentiality: do not suggest sharing private, confidential, or client-owned details. Return only valid JSON. Use exactly one of these shapes: {"status":"needs_clarification","message":"...","questions":["..."]} or {"status":"ready","message":"...","draft":{...}}. For a ready draft, include focus, focusBullets, mainBuild, definitionOfDone, weeklyTargets, dailyLog, outreachTracker, rules, fearCheck, tasksToCreate, and optional notes. The Weekly dashboard fields must be populated: focusBullets must contain 3-6 concrete bullets, mainBuild must be one clear build outcome, and definitionOfDone must contain 3-6 verifiable completion checks. dailyLog must contain Sunday through Saturday. Each weekly task should include title, nextAction, reason, expectedOutcome, estimateMinutes, energy, focusType, milestoneId, and optional weeklyPriorityId. tasksToCreate must use only provided milestoneId values and optional weeklyPriorityId values. If no milestones are available, return an empty tasksToCreate array and explain why in message or notes.`;

  const prompt = JSON.stringify({
    weekStart,
    weekLabel,
    currentPlan,
    allowedContext: allowedIdsSummary(context),
    conversation: messages,
  }, null, 2);

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_PLANNING_MODEL ?? "claude-sonnet-4-5",
    max_tokens: 5000,
    system,
    messages: [{ role: "user", content: `Plan this week from the following JSON context. Return only JSON.\n${prompt}` }],
  });
  const text = message.content.find((block) => block.type === "text")?.text;
  if (!text) return Response.json({ error: "Claude returned no planning text." }, { status: 502 });

  try {
    return Response.json(parseAiResponse(extractJson(text), context));
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 });
  }
}