import Anthropic from "@anthropic-ai/sdk";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { planningProposalSchema, planningRequestSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

const systemPrompt = `You are the planning assistant for a personal Execution OS. The permanent operating principle is: "Share everything I build." Treat it as a strong default, never an instruction to disclose confidential, private, or client-owned work. Propose a focused, sequential plan that maintains the hierarchy from project to milestone to task. Return a single JSON object with assumptions, confidentialityNotes, and milestones. Do not wrap it in markdown. Do not claim anything has been completed.`;

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" ? value as LooseRecord : {};
}

function asString(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return JSON.stringify(value);
}

function normalizeFocusType(value: unknown) {
  const focus = asString(value).toLowerCase();
  if (["revenue", "learning", "portfolio", "maintenance"].includes(focus)) return focus;
  if (["creative", "content", "marketing", "brand", "visibility", "proof"].includes(focus)) return "portfolio";
  if (["sales", "outreach", "pipeline", "lead generation"].includes(focus)) return "revenue";
  return "maintenance";
}

function normalizeEnergy(value: unknown) {
  const energy = asString(value).toLowerCase();
  return ["low", "medium", "high"].includes(energy) ? energy : "medium";
}

function normalizeImpact(value: unknown) {
  if (value && typeof value === "object") {
    const impact = value as Partial<Record<"revenue" | "learning" | "portfolio" | "automation" | "enjoyment", unknown>>;
    return {
      revenue: Number(impact.revenue ?? 3),
      learning: Number(impact.learning ?? 3),
      portfolio: Number(impact.portfolio ?? 3),
      automation: Number(impact.automation ?? 2),
      enjoyment: Number(impact.enjoyment ?? 3),
    };
  }
  const label = asString(value).toLowerCase();
  const score = label === "high" ? 5 : label === "low" ? 2 : 3;
  return { revenue: score, learning: 3, portfolio: score, automation: 2, enjoyment: 3 };
}

function normalizeProposal(value: unknown) {
  const root = asRecord(value);
  const proposal = asRecord(root.proposal ?? root);
  const milestones = Array.isArray(proposal.milestones) ? proposal.milestones : [];

  return {
    assumptions: Array.isArray(proposal.assumptions) ? proposal.assumptions.map((item) => asString(item)).filter(Boolean) : [],
    confidentialityNotes: Array.isArray(proposal.confidentialityNotes) ? proposal.confidentialityNotes.map((item) => asString(item)).filter(Boolean) : [],
    milestones: milestones.map((milestoneValue) => {
      const milestone = asRecord(milestoneValue);
      const tasks = Array.isArray(milestone.tasks) ? milestone.tasks : [];
      const outcome = asString(milestone.outcome ?? milestone.description ?? milestone.goal ?? milestone.result, "Deliver a concrete project outcome.");
      return {
        title: asString(milestone.title, "Untitled milestone"),
        outcome,
        tasks: tasks.map((taskValue) => {
          const task = asRecord(taskValue);
          return {
            title: asString(task.title, "Untitled task"),
            nextAction: asString(task.nextAction ?? task.next_action ?? task.action, "Define the next concrete action."),
            reason: asString(task.reason ?? task.why, "This task moves the project forward."),
            expectedOutcome: asString(task.expectedOutcome ?? task.expected_outcome ?? task.outcome, outcome),
            estimateMinutes: Number(task.estimateMinutes ?? task.estimate_minutes ?? 45),
            energy: normalizeEnergy(task.energy),
            focusType: normalizeFocusType(task.focusType ?? task.focus_type),
            impact: normalizeImpact(task.impact),
            shareRecommendation: asString(task.shareRecommendation ?? task.share_recommendation, "Share the useful public-safe artifact or lesson."),
          };
        }),
      };
    }),
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Claude did not return a JSON object.");
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

function parseProposal(text: string) {
  const normalized = normalizeProposal(extractJson(text));
  const result = planningProposalSchema.safeParse(normalized);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(issue ? `Claude returned an incomplete plan at ${issue.path.join(".") || "root"}: ${issue.message}` : "Claude returned an invalid planning proposal.");
  }
  return result.data;
}

export async function POST(request: Request) {
  await requireSession();
  const parsed = planningRequestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });

  const supabase = getSupabaseAdmin();
  const project = await supabase.from("projects").select("*").eq("id", parsed.data.projectId).single();
  if (project.error) return Response.json({ error: project.error.message }, { status: project.error.code === "PGRST116" ? 404 : 500 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_PLANNING_MODEL ?? "claude-sonnet-4-5",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: `Project: ${project.data.title}\nPurpose: ${project.data.purpose}\nInstructions: ${parsed.data.instructions ?? "None"}\n\nReturn JSON with assumptions, confidentialityNotes, and milestones. Each task must include title, nextAction, reason, expectedOutcome, estimateMinutes, energy, focusType, impact, and shareRecommendation.` }],
  });
  const text = message.content.find((block) => block.type === "text")?.text;
  if (!text) return Response.json({ error: "Claude returned no planning text." }, { status: 502 });

  let proposal;
  try {
    proposal = parseProposal(text);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Claude returned an invalid planning proposal." }, { status: 502 });
  }

  const draft = await supabase.from("ai_planning_drafts").insert({
    target_type: "project",
    target_id: project.data.id,
    prompt: parsed.data.instructions,
    proposal,
  }).select("*").single();
  if (draft.error) return Response.json({ error: draft.error.message }, { status: 500 });

  return Response.json({ draft: { id: draft.data.id }, proposal }, { status: 201 });
}