import { requireSession } from "@/lib/auth/session";
import { getExecutionOverview } from "@/lib/execution/overview";

export const runtime = "nodejs";

export async function GET() {
  await requireSession();
  try {
    return Response.json(await getExecutionOverview());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load execution workspace." }, { status: 503 });
  }
}
