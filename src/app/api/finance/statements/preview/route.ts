import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { statementPreviewSchema } from "@/lib/finance/validation";
import { parseStatementText } from "@/lib/finance/statement-parser";
import type { FinanceCategory } from "@/lib/finance/types";

export const runtime = "nodejs";
const ownerId = "owner";

export async function POST(request: Request) {
  await requireSession();
  const parsed = statementPreviewSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: categories, error: categoryError } = await supabase.from("finance_categories").select("*").eq("owner_id", ownerId).eq("is_active", true);
  if (categoryError) return Response.json({ error: categoryError.message }, { status: 500 });
  const rows = parseStatementText(parsed.data.text, parsed.data.accountId, (categories ?? []) as FinanceCategory[]);
  if (!rows.length) return Response.json({ error: "No transactions detected. Paste lines like: 2026-07-25 UBER TRIP -187.00" }, { status: 400 });

  const fingerprints = rows.map((row) => row.duplicateFingerprint);
  const { data: existing, error: existingError } = await supabase.from("finance_transactions").select("duplicate_fingerprint").eq("owner_id", ownerId).in("duplicate_fingerprint", fingerprints);
  if (existingError) return Response.json({ error: existingError.message }, { status: 500 });
  const duplicateSet = new Set((existing ?? []).map((row) => row.duplicate_fingerprint));

  const { data: statementImport, error: importError } = await supabase.from("finance_statement_imports").insert({ owner_id: ownerId, account_id: parsed.data.accountId, source_name: parsed.data.sourceName, status: "preview" }).select("*").single();
  if (importError) return Response.json({ error: importError.message }, { status: 500 });

  const rowPayload = rows.map((row) => ({
    import_id: statementImport.id,
    transaction_date: row.transactionDate,
    description: row.description,
    normalized_merchant: row.normalizedMerchant,
    amount: row.amount,
    transaction_type: row.transactionType,
    category_id: row.categoryId,
    duplicate_fingerprint: row.duplicateFingerprint,
    duplicate_status: duplicateSet.has(row.duplicateFingerprint) ? "duplicate" : "new",
    confidence: row.confidence,
  }));
  const { data: importRows, error: rowError } = await supabase.from("finance_statement_import_rows").insert(rowPayload).select("*");
  if (rowError) return Response.json({ error: rowError.message }, { status: 500 });
  return Response.json({ import: statementImport, rows: importRows });
}
