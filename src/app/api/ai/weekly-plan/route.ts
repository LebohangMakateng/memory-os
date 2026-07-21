import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { taskCreateSchema, taskUpdateSchema, weeklyPlanSchema } from "@/lib/execution/validation";

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
    description: z.string().nullable().optional(),
    nextAction: z.string(),
    reason: z.string().optional(),
    expectedOutcome: z.string().optional(),
    status: z.string(),
    estimateMinutes: z.number().optional(),
    difficulty: z.number().optional(),
    energy: z.string().optional(),
    focusType: z.string().optional(),
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

const answerResponseSchema = z.object({
  status: z.literal("answer"),
  message: z.string().trim().min(1).max(4000),
});

const taskUpdatesResponseSchema = z.object({
  status: z.literal("task_updates"),
  message: z.string().trim().min(1).max(4000),
  updates: z.array(z.unknown()).min(1).max(20),
});

type WeeklyContext = z.infer<typeof weeklyContextSchema>;
type LooseRecord = Record<string, unknown>;
type TaskPatch = z.infer<typeof taskUpdateSchema>;

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
  const match = context.milestones.find((milestone) => milestone.title.toLowerCase() === title || (title && milestone.title.toLowerCase().includes(title)));
  return match?.id ?? context.milestones[0]?.id ?? "";
}

function findPriorityId(task: LooseRecord, context: WeeklyContext) {
  const explicit = asString(task.weeklyPriorityId ?? task.weekly_priority_id);
  if (context.priorities.some((priority) => priority.id === explicit)) return explicit;
  const title = asString(task.weeklyPriorityTitle ?? task.priority ?? task.weeklyPriority).toLowerCase();
  const match = title ? context.priorities.find((priority) => priority.title.toLowerCase() === title || priority.title.toLowerCase().includes(title)) : null;
  return match?.id ?? null;
}

function findTaskId(update: LooseRecord, context: WeeklyContext) {
  const explicit = asString(update.taskId ?? update.task_id ?? update.id);
  if (context.tasks.some((task) => task.id === explicit)) return explicit;
  const title = asString(update.titleToFind ?? update.taskTitle ?? update.task ?? update.currentTitle ?? update.title).toLowerCase();
  if (!title) return "";
  const exactMatches = context.tasks.filter((task) => task.title.toLowerCase() === title);
  if (exactMatches.length === 1) return exactMatches[0].id;
  const partialMatches = context.tasks.filter((task) => task.title.toLowerCase().includes(title));
  return partialMatches.length === 1 ? partialMatches[0].id : "";
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

function normalizeTaskPatch(value: unknown, context: WeeklyContext) {
  const update = asRecord(value);
  const changes = asRecord(update.changes ?? update.patch ?? update.fields ?? update);
  const taskId = findTaskId(update, context);
  if (!taskId) throw new Error("Claude returned a task update without a unique matching task.");

  const patch: Record<string, unknown> = {};
  if (changes.newTitle !== undefined || changes.renameTo !== undefined) patch.title = asString(changes.newTitle ?? changes.renameTo);
  else if (changes.title !== undefined && !changes.taskTitle && !changes.titleToFind && !changes.currentTitle) patch.title = asString(changes.title);
  if (changes.description !== undefined) patch.description = asString(changes.description) || null;
  if (changes.addNote !== undefined || changes.noteToAppend !== undefined || changes.appendDescription !== undefined) {
    const existing = context.tasks.find((task) => task.id === taskId)?.description ?? "";
    const addition = asString(changes.addNote ?? changes.noteToAppend ?? changes.appendDescription);
    patch.description = [existing, addition].filter(Boolean).join("\n");
  }
  if (changes.nextAction !== undefined || changes.next_action !== undefined) patch.nextAction = asString(changes.nextAction ?? changes.next_action);
  if (changes.reason !== undefined) patch.reason = asString(changes.reason);
  if (changes.expectedOutcome !== undefined || changes.expected_outcome !== undefined) patch.expectedOutcome = asString(changes.expectedOutcome ?? changes.expected_outcome);
  if (changes.status !== undefined || changes.complete === true || changes.completed === true) patch.status = changes.complete === true || changes.completed === true ? "done" : normalizeStatus(changes.status);
  if (changes.weeklyPriorityId !== undefined || changes.weekly_priority_id !== undefined || changes.priority !== undefined || changes.weeklyPriorityTitle !== undefined) {
    patch.weeklyPriorityId = findPriorityId(changes, context);
  }
  if (changes.estimateMinutes !== undefined || changes.estimate_minutes !== undefined || changes.estimate !== undefined) patch.estimateMinutes = Math.max(15, Math.min(480, Math.round(asNumber(changes.estimateMinutes ?? changes.estimate_minutes ?? changes.estimate, 45) / 15) * 15));
  if (changes.difficulty !== undefined) patch.difficulty = Math.max(1, Math.min(5, Math.round(asNumber(changes.difficulty, 3))));
  if (changes.energy !== undefined) patch.energy = normalizeEnergy(changes.energy);
  if (changes.focusType !== undefined || changes.focus_type !== undefined) patch.focusType = normalizeFocusType(changes.focusType ?? changes.focus_type);
  if (changes.shareStatus !== undefined || changes.share_status !== undefined) patch.shareStatus = normalizeShareStatus(changes.shareStatus ?? changes.share_status);
  if (changes.shareChannel !== undefined || changes.share_channel !== undefined) patch.shareChannel = asString(changes.shareChannel ?? changes.share_channel) || null;
  if (changes.shareUrl !== undefined || changes.share_url !== undefined) patch.shareUrl = asString(changes.shareUrl ?? changes.share_url) || null;

  return { taskId, patch: taskUpdateSchema.parse(patch) };
}

function toTaskPatch(task: TaskPatch) {
  return {
    ...(task.milestoneId !== undefined ? { milestone_id: task.milestoneId } : {}),
    ...(task.weeklyPriorityId !== undefined ? { weekly_priority_id: task.weeklyPriorityId } : {}),
    ...(task.title !== undefined ? { title: task.title } : {}),
    ...(task.description !== undefined ? { description: task.description } : {}),
    ...(task.nextAction !== undefined ? { next_action: task.nextAction } : {}),
    ...(task.reason !== undefined ? { reason: task.reason } : {}),
    ...(task.expectedOutcome !== undefined ? { expected_outcome: task.expectedOutcome } : {}),
    ...(task.status !== undefined ? { status: task.status } : {}),
    ...(task.dueDate !== undefined ? { due_date: task.dueDate } : {}),
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

async function applyTaskUpdates(updates: unknown[], context: WeeklyContext) {
  const normalized = updates.map((update) => normalizeTaskPatch(update, context));
  const supabase = getSupabaseAdmin();
  const applied = [];
  for (const update of normalized) {
    const { data, error } = await supabase
      .from("tasks")
      .update(toTaskPatch(update.patch))
      .eq("id", update.taskId)
      .select("id,title,status,description,next_action,weekly_priority_id")
      .single();
    if (error) throw new Error(error.message);
    applied.push(data);
  }
  return applied;
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
    existingTasks: context.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      nextAction: task.nextAction,
      reason: task.reason ?? "",
      expectedOutcome: task.expectedOutcome ?? "",
      status: task.status,
      milestoneId: task.milestoneId,
      weeklyPriorityId: task.weeklyPriorityId,
      estimateMinutes: task.estimateMinutes,
      difficulty: task.difficulty,
      energy: task.energy,
      focusType: task.focusType,
    })),
  };
}

async function parseAiResponse(value: unknown, context: WeeklyContext) {
  const root = asRecord(value);
  if (root.status === "ready") return normalizeReadyResponse(value, context);
  if (root.status === "answer") return answerResponseSchema.parse(value);
  if (root.status === "task_updates") {
    const parsed = taskUpdatesResponseSchema.parse(value);
    const applied = await applyTaskUpdates(parsed.updates, context);
    return { status: "task_updates_applied", message: parsed.message, applied };
  }
  return clarificationResponseSchema.parse(value);
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return issue ? `Claude returned an incomplete weekly planner response at ${issue.path.join(".") || "root"}: ${issue.message}` : "Claude returned an invalid weekly planner response.";
  }
  return error instanceof Error ? error.message : "Claude returned an invalid weekly planner response.";
}

export async function POST(request: Request) {
  await requireSession();
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });

  const { messages, currentPlan, weekStart, weekLabel, context } = parsed.data;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = `You are the weekly planning assistant for a personal Execution OS. The permanent operating principle is "Share everything I build." Use the current weekly plan and existing weekly tasks as context. Return only valid JSON. You can do three things: answer retrieval questions, apply modifications to existing weekly tasks, or create a new approvable weekly draft. For questions like what is left, incomplete, priorities, finished, or remaining work, return {"status":"answer","message":"..."} using only provided context. For requests to edit, rename, mark complete, update priority, update description, or append notes to existing tasks, identify the unique task from existingTasks by id/title and return {"status":"task_updates","message":"...","updates":[{"taskId":"...","changes":{...}}]}. Use weeklyPriorityId values from weeklyPriorities when changing priority. If the task title is ambiguous, return needs_clarification. For new weekly planning, ask detailed clarification questions until intent is specific enough; when ready return {"status":"ready","message":"...","draft":{...}}. Ready drafts require focus, focusBullets, mainBuild, definitionOfDone, weeklyTargets, dailyLog, outreachTracker, rules, fearCheck, tasksToCreate, and optional notes. tasksToCreate must be additive and use only provided milestoneId values and optional weeklyPriorityId values. Do not claim work is completed unless updating an existing task status to done at the user's request. Respect confidentiality and do not suggest sharing private, confidential, or client-owned details.`;

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
    messages: [{ role: "user", content: `Work with this weekly planning JSON context. Return only JSON.\n${prompt}` }],
  });
  const text = message.content.find((block) => block.type === "text")?.text;
  if (!text) return Response.json({ error: "Claude returned no planning text." }, { status: 502 });

  try {
    return Response.json(await parseAiResponse(extractJson(text), context));
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 });
  }
}
