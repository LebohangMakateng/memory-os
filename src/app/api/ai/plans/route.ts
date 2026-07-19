import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const requestSchema = z.object({
  targetType: z.enum(["initiative", "project"]),
  targetTitle: z.string().min(1).max(160),
  targetPurpose: z.string().min(1).max(4000),
  instructions: z.string().max(4000).optional(),
});

const proposalSchema = z.object({
  assumptions: z.array(z.string()),
  confidentialityNotes: z.array(z.string()),
  milestones: z.array(z.object({
    title: z.string(),
    outcome: z.string(),
    tasks: z.array(z.object({
      title: z.string(),
      nextAction: z.string(),
      reason: z.string(),
      expectedOutcome: z.string(),
      estimateMinutes: z.number().int().min(15).max(480),
      energy: z.enum(["low", "medium", "high"]),
      focusType: z.enum(["revenue", "learning", "portfolio", "maintenance"]),
      impact: z.object({
        revenue: z.number().int().min(0).max(5),
        learning: z.number().int().min(0).max(5),
        portfolio: z.number().int().min(0).max(5),
        automation: z.number().int().min(0).max(5),
        enjoyment: z.number().int().min(0).max(5),
      }),
      shareRecommendation: z.string(),
    })),
  })),
});

const systemPrompt = `You are the planning assistant for a personal Execution OS. The permanent operating principle is: "Share everything I build." Treat it as a strong default, never an instruction to disclose confidential, private, or client-owned work. Propose a focused, sequential plan that maintains the hierarchy from long-term goal through task. Return only valid JSON matching the requested shape. Do not claim that anything has been completed.`;

export async function POST(request: Request) {
  await requireSession();
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { targetType, targetTitle, targetPurpose, instructions } = parsed.data;
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_PLANNING_MODEL ?? "claude-sonnet-4-5",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{
      role: "user",
      content: `Create milestones and tasks for this ${targetType}.\nTitle: ${targetTitle}\nPurpose: ${targetPurpose}\nAdditional instructions: ${instructions ?? "None"}\n\nReturn JSON with assumptions, confidentialityNotes, and milestones.`,
    }],
  });
  const text = message.content.find((block) => block.type === "text")?.text;
  if (!text) return Response.json({ error: "Claude returned no planning text." }, { status: 502 });

  try {
    return Response.json({ proposal: proposalSchema.parse(JSON.parse(text)) });
  } catch {
    return Response.json({ error: "Claude returned an invalid planning proposal." }, { status: 502 });
  }
}
