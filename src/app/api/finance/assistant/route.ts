import Anthropic from "@anthropic-ai/sdk";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { buildAssistantSnapshot, financeAssistantMessageSchema, normalizeAssistantAction, systemPromptForFinanceAssistant, assistantResponseSchema, type FinanceAssistantContext } from "@/lib/finance/assistant";
import { currentFinanceMonth } from "@/lib/finance/calculations";
import type { FinanceAccount, FinanceBudgetLine, FinanceCategory, FinanceMonthlyPlan, FinanceTransaction } from "@/lib/finance/types";

export const runtime = "nodejs";
const ownerId = "owner";

async function loadContext(month = currentFinanceMonth()): Promise<FinanceAssistantContext> {
  const supabase = getSupabaseAdmin();
  const [accountsResult, categoriesResult, transactionsResult, planResult] = await Promise.all([
    supabase.from("finance_accounts").select("*").eq("owner_id", ownerId).eq("is_active", true).order("created_at", { ascending: true }),
    supabase.from("finance_categories").select("*").eq("owner_id", ownerId).eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("finance_transactions").select("*").eq("owner_id", ownerId).eq("financial_month", month).order("transaction_date", { ascending: false }).limit(80),
    supabase.from("finance_monthly_plans").select("*").eq("owner_id", ownerId).eq("month", month).maybeSingle(),
  ]);
  const error = accountsResult.error || categoriesResult.error || transactionsResult.error || planResult.error;
  if (error) throw new Error(error.message);
  let budgetLines: FinanceBudgetLine[] = [];
  if (planResult.data?.id) {
    const budgetResult = await supabase.from("finance_budget_lines").select("*").eq("plan_id", planResult.data.id);
    if (budgetResult.error) throw new Error(budgetResult.error.message);
    budgetLines = (budgetResult.data ?? []) as FinanceBudgetLine[];
  }
  return {
    month,
    accounts: (accountsResult.data ?? []) as FinanceAccount[],
    categories: (categoriesResult.data ?? []) as FinanceCategory[],
    transactions: (transactionsResult.data ?? []) as FinanceTransaction[],
    plan: planResult.data as FinanceMonthlyPlan | null,
    budgetLines,
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/{[sS]*}/);
  return match?.[0] ?? trimmed;
}

export async function POST(request: Request) {
  await requireSession();
  const parsed = financeAssistantMessageSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });

  const context = await loadContext();
  const snapshot = buildAssistantSnapshot(context);
  const latestUserMessage = parsed.data.messages.at(-1)?.content ?? "";
  const supabase = getSupabaseAdmin();
  await supabase.from("finance_chat_messages").insert({ owner_id: ownerId, role: "user", content: latestUserMessage });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_PLANNING_MODEL ?? "claude-sonnet-4-5",
    max_tokens: 2500,
    system: systemPromptForFinanceAssistant(),
    messages: [{
      role: "user",
      content: ["Finance snapshot:", JSON.stringify(snapshot), "", "Conversation:", JSON.stringify(parsed.data.messages), "", "Return the JSON response now."].join("\\n"),
    }],
  });
  const text = message.content.find((block) => block.type === "text")?.text;
  if (!text) return Response.json({ error: "Assistant returned no text." }, { status: 502 });

  let assistantResult;
  try {
    assistantResult = assistantResponseSchema.parse(JSON.parse(extractJson(text)));
  } catch {
    return Response.json({ error: "Assistant returned an invalid finance response." }, { status: 502 });
  }

  const { data: assistantMessage } = await supabase.from("finance_chat_messages").insert({ owner_id: ownerId, role: "assistant", content: assistantResult.message }).select("*").single();
  const normalizedActions = assistantResult.proposedActions.map((action) => normalizeAssistantAction(action, context));
  const insertedActions = [];
  for (const action of normalizedActions) {
    const { data, error } = await supabase.from("finance_ai_actions").insert({ owner_id: ownerId, action_type: action.actionType, summary: action.summary, payload: action.payload }).select("*").single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    insertedActions.push(data);
  }

  return Response.json({ message: assistantResult.message, chatMessage: assistantMessage, actions: insertedActions });
}
