import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { normalizeMoneyInput } from "@/lib/finance/calculations";
import { financeCommitmentSchema } from "@/lib/finance/validation";

export const runtime = "nodejs";
const ownerId = "owner";

export async function POST(request: Request) {
  await requireSession();
  const parsed = financeCommitmentSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const payload = {
    owner_id: ownerId,
    name: parsed.data.name,
    amount: normalizeMoneyInput(parsed.data.amount),
    due_date: parsed.data.dueDate,
    category_id: parsed.data.categoryId || null,
    notes: parsed.data.notes || null,
  };
  const { data, error } = await supabase.from("finance_commitments").insert(payload).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
