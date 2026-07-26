import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordFinanceAudit(supabase: SupabaseClient, input: {
  ownerId?: string;
  entityType: string;
  entityId?: string | null;
  action: "create" | "update" | "delete" | "import" | "confirm" | "reject";
  source?: "manual" | "ai" | "import" | "system";
  before?: unknown;
  after?: unknown;
}) {
  await supabase.from("finance_audit_events").insert({
    owner_id: input.ownerId ?? "owner",
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    source: input.source ?? "manual",
    before: input.before ?? null,
    after: input.after ?? null,
  });
}
