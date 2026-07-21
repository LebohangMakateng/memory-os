import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { projectCreateSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

function toProjectPayload(project: {
  initiativeId: string;
  title: string;
  purpose: string;
  status: string;
  shareStatus: string;
}) {
  return {
    initiative_id: project.initiativeId,
    title: project.title,
    purpose: project.purpose,
    status: project.status,
    share_status: project.shareStatus,
  };
}

export async function GET() {
  await requireSession();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  await requireSession();
  const parsed = projectCreateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .insert(toProjectPayload(parsed.data))
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}