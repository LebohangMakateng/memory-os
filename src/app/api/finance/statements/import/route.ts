import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { financeMonthFromDate } from "@/lib/finance/calculations";
import { statementImportSchema } from "@/lib/finance/validation";

export const runtime = "nodejs";
const ownerId = "owner";

export async function POST(request: Request) {
  await requireSession();
  const parsed = statementImportSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: statementImport, error: importError } = await supabase.from("finance_statement_imports").select("*").eq("id", parsed.data.importId).eq("owner_id", ownerId).single();
  if (importError) return Response.json({ error: importError.message }, { status: importError.code === "PGRST116" ? 404 : 500 });
  const { data: rows, error: rowsError } = await supabase.from("finance_statement_import_rows").select("*").eq("import_id", parsed.data.importId);
  if (rowsError) return Response.json({ error: rowsError.message }, { status: 500 });
  const updates = new Map(parsed.data.rows.map((row) => [row.id, row]));
  const toImport = (rows ?? []).filter((row) => !updates.get(row.id)?.excluded && row.duplicate_status !== "duplicate").map((row) => {
    const update = updates.get(row.id);
    return {
      owner_id: ownerId,
      account_id: statementImport.account_id,
      transaction_date: row.transaction_date,
      posted_date: null,
      financial_month: financeMonthFromDate(row.transaction_date),
      description: row.description,
      normalized_merchant: update?.normalizedMerchant || row.normalized_merchant,
      amount: row.amount,
      transaction_type: row.transaction_type,
      category_id: update?.categoryId || row.category_id,
      source: "import",
      source_reference: parsed.data.importId,
      duplicate_fingerprint: row.duplicate_fingerprint,
      notes: null,
    };
  });
  if (!toImport.length) return Response.json({ error: "No new rows selected for import." }, { status: 400 });
  const { data, error } = await supabase.from("finance_transactions").insert(toImport).select("*");
  if (error) return Response.json({ error: error.code === "23505" ? "One or more rows look like duplicates." : error.message }, { status: error.code === "23505" ? 409 : 500 });
  await supabase.from("finance_statement_imports").update({ status: "imported", updated_at: nowIso() }).eq("id", parsed.data.importId);
  return Response.json({ imported: data });
}
