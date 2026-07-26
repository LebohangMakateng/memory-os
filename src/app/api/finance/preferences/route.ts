import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { financePreferencesSchema } from "@/lib/finance/validation";

export const runtime = "nodejs";
const ownerId = "owner";

export async function PUT(request: Request) {
  await requireSession();
  const parsed = financePreferencesSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("finance_preferences").upsert({ owner_id: ownerId, currency: "ZAR", payday_day: parsed.data.paydayDay ?? null, risk_tolerance: parsed.data.riskTolerance, strict_categories: parsed.data.strictCategories, assistant_tone: parsed.data.assistantTone, savings_priority: parsed.data.savingsPriority || null, updated_at: nowIso() }, { onConflict: "owner_id" }).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
