import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin, nowIso } from "@/lib/db/supabase";
import { projectUpdateSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

function toProjectPatch(project: {
  initiativeId?: string;
  title?: string;
  purpose?: string;
  status?: string;
  shareStatus?: string;
}) {
  return {
    ...(project.initiativeId ? { initiative_id: project.initiativeId } : {}),
    ...(project.title ? { title: project.title } : {}),
    ...(project.purpose ? { purpose: project.purpose } : {}),
    ...(project.status ? { status: project.status } : {}),
    ...(project.shareStatus ? { share_status: project.shareStatus } : {}),
    updated_at: nowIso(),
  };
}

export async function PATCH(request: Request, context: RouteContext<"/api/execution/projects/[projectId]">) {
  await requireSession();
  const { projectId } = await context.params;
  const parsed = projectUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .update(toProjectPatch(parsed.data))
    .eq("id", projectId)
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  return Response.json(data);
}

export async function DELETE(_request: Request, context: RouteContext<"/api/execution/projects/[projectId]">) {
  await requireSession();
  const { projectId } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .update({ status: "archived", updated_at: nowIso() })
    .eq("id", projectId)
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  return Response.json(data);
}