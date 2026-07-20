import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { taskStatusSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext<"/api/execution/tasks/[taskId]">) {
  await requireSession();
  const { taskId } = await context.params;
  const parsed = taskStatusSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: parsed.data.status, updated_at: nowIso() })
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  return Response.json(data);
}