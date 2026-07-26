import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { assistantActionPayloadSchema, monthlyPlanPayloadForBudget, transactionInsertPayload, type FinanceAssistantContext } from "@/lib/finance/assistant";
import { recordFinanceAudit } from "@/lib/finance/audit";
import { normalizeMoneyInput } from "@/lib/finance/calculations";
import type { FinanceAccount, FinanceBudgetLine, FinanceCategory, FinanceMonthlyPlan, FinanceTransaction } from "@/lib/finance/types";

export const runtime = "nodejs";
const ownerId = "owner";

async function loadContext(month: string): Promise<FinanceAssistantContext> {
  const supabase = getSupabaseAdmin();
  const [accountsResult, categoriesResult, transactionsResult, planResult] = await Promise.all([
    supabase.from("finance_accounts").select("*").eq("owner_id", ownerId).eq("is_active", true),
    supabase.from("finance_categories").select("*").eq("owner_id", ownerId).eq("is_active", true),
    supabase.from("finance_transactions").select("*").eq("owner_id", ownerId).eq("financial_month", month),
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
  return { month, accounts: (accountsResult.data ?? []) as FinanceAccount[], categories: (categoriesResult.data ?? []) as FinanceCategory[], transactions: (transactionsResult.data ?? []) as FinanceTransaction[], plan: planResult.data as FinanceMonthlyPlan | null, budgetLines };
}

async function applyBudgetAction(context: FinanceAssistantContext, payload: ReturnType<typeof monthlyPlanPayloadForBudget>) {
  const supabase = getSupabaseAdmin();
  const { data: plan, error: planError } = await supabase.from("finance_monthly_plans").upsert({
    owner_id: ownerId,
    month: payload.month,
    currency: "ZAR",
    expected_income: normalizeMoneyInput(payload.expectedIncome),
    savings_target: normalizeMoneyInput(payload.savingsTarget),
    notes: payload.notes || null,
    updated_at: nowIso(),
  }, { onConflict: "owner_id,month" }).select("*").single();
  if (planError) throw new Error(planError.message);

  const { error: deleteError } = await supabase.from("finance_budget_lines").delete().eq("plan_id", plan.id);
  if (deleteError) throw new Error(deleteError.message);
  const lines = payload.budgetLines.filter((line) => normalizeMoneyInput(line.plannedAmount) !== "0.00").map((line) => ({ plan_id: plan.id, category_id: line.categoryId, planned_amount: normalizeMoneyInput(line.plannedAmount), updated_at: nowIso() }));
  if (lines.length) {
    const { error } = await supabase.from("finance_budget_lines").insert(lines);
    if (error) throw new Error(error.message);
  }
  return { plan, budgetLines: lines, contextMonth: context.month };
}

export async function POST(_request: Request, context: { params: Promise<{ actionId: string }> }) {
  await requireSession();
  const { actionId } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data: action, error: loadError } = await supabase.from("finance_ai_actions").select("*").eq("id", actionId).eq("owner_id", ownerId).single();
  if (loadError) return Response.json({ error: loadError.message }, { status: loadError.code === "PGRST116" ? 404 : 500 });
  if (action.status !== "pending") return Response.json({ error: "This action is no longer pending." }, { status: 409 });

  const payload = assistantActionPayloadSchema.parse(action.payload);
  let result: unknown;
  try {
    if (payload.actionType === "create_transaction") {
      const { data, error } = await supabase.from("finance_transactions").insert(transactionInsertPayload(payload)).select("*").single();
      if (error) throw new Error(error.code === "23505" ? "This transaction looks like a duplicate." : error.message);
      result = data;
      await recordFinanceAudit(supabase, { entityType: "transaction", entityId: data.id, action: "create", source: "ai", after: data });
    } else if (payload.actionType === "update_transaction") {
      const { data: before, error: loadTxError } = await supabase.from("finance_transactions").select("*").eq("id", payload.transactionId).eq("owner_id", ownerId).single();
      if (loadTxError) throw new Error(loadTxError.message);
      const patch = {
        ...(payload.accountId !== undefined ? { account_id: payload.accountId } : {}),
        ...(payload.transactionDate !== undefined ? { transaction_date: payload.transactionDate } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.normalizedMerchant !== undefined ? { normalized_merchant: payload.normalizedMerchant || null } : {}),
        ...(payload.amount !== undefined ? { amount: normalizeMoneyInput(payload.amount) } : {}),
        ...(payload.transactionType !== undefined ? { transaction_type: payload.transactionType } : {}),
        ...(payload.categoryId !== undefined ? { category_id: payload.categoryId || null } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes || null } : {}),
        updated_at: nowIso(),
      };
      const { data, error } = await supabase.from("finance_transactions").update(patch).eq("id", payload.transactionId).eq("owner_id", ownerId).select("*").single();
      if (error) throw new Error(error.message);
      result = data;
      await recordFinanceAudit(supabase, { entityType: "transaction", entityId: payload.transactionId, action: "update", source: "ai", before, after: data });
    } else if (payload.actionType === "delete_transaction") {
      const { data: before, error: loadTxError } = await supabase.from("finance_transactions").select("*").eq("id", payload.transactionId).eq("owner_id", ownerId).single();
      if (loadTxError) throw new Error(loadTxError.message);
      const { error } = await supabase.from("finance_transactions").delete().eq("id", payload.transactionId).eq("owner_id", ownerId);
      if (error) throw new Error(error.message);
      result = { deleted: payload.transactionId };
      await recordFinanceAudit(supabase, { entityType: "transaction", entityId: payload.transactionId, action: "delete", source: "ai", before });
    } else if (payload.actionType === "create_goal") {
      const { data, error } = await supabase.from("finance_goals").insert({ owner_id: ownerId, name: payload.name, goal_type: "savings", target_amount: normalizeMoneyInput(payload.targetAmount), current_amount: normalizeMoneyInput(payload.currentAmount), monthly_contribution: normalizeMoneyInput(payload.monthlyContribution), target_date: payload.targetDate || null }).select("*").single();
      if (error) throw new Error(error.message);
      result = data;
      await recordFinanceAudit(supabase, { entityType: "goal", entityId: data.id, action: "create", source: "ai", after: data });
    } else {
      const financeContext = await loadContext(payload.month);
      result = await applyBudgetAction(financeContext, monthlyPlanPayloadForBudget(financeContext, payload));
      await recordFinanceAudit(supabase, { entityType: "monthly_plan", action: "update", source: "ai", after: result });
    }
  } catch (caught) {
    return Response.json({ error: caught instanceof Error ? caught.message : "Could not confirm action." }, { status: 500 });
  }

  const { data: updated, error: updateError } = await supabase.from("finance_ai_actions").update({ status: "confirmed", confirmed_at: nowIso(), result }).eq("id", actionId).eq("owner_id", ownerId).select("*").single();
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  return Response.json({ action: updated, result });
}
