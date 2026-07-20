import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { aiPlanningDrafts, projects } from "@/lib/db/schema";
import { planningProposalSchema, planningRequestSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

const systemPrompt = `You are the planning assistant for a personal Execution OS. The permanent operating principle is: "Share everything I build." Treat it as a strong default, never an instruction to disclose confidential, private, or client-owned work. Propose a focused, sequential plan that maintains the hierarchy from project to milestone to task. Return only valid JSON matching the requested shape. Do not claim anything has been completed.`;

export async function POST(request: Request) {
  await requireSession();
  if (!db) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const parsed = planningRequestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });
  const [project] = await db.select().from(projects).where(eq(projects.id, parsed.data.projectId)).limit(1);
  if (!project) return Response.json({ error: "Project not found." }, { status: 404 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_PLANNING_MODEL ?? "claude-sonnet-4-5",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: `Project: ${project.title}\nPurpose: ${project.purpose}\nInstructions: ${parsed.data.instructions ?? "None"}\n\nReturn JSON with assumptions, confidentialityNotes, and milestones.` }],
  });
  const text = message.content.find((block) => block.type === "text")?.text;
  if (!text) return Response.json({ error: "Claude returned no planning text." }, { status: 502 });
  let proposal;
  try {
    proposal = planningProposalSchema.parse(JSON.parse(text));
  } catch {
    return Response.json({ error: "Claude returned an invalid planning proposal." }, { status: 502 });
  }
  const [draft] = await db.insert(aiPlanningDrafts).values({
    targetType: "project",
    targetId: project.id,
    prompt: parsed.data.instructions,
    proposal,
  }).returning();
  return Response.json({ draft, proposal }, { status: 201 });
}
