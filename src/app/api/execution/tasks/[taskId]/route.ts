import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { taskStatusSchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext<"/api/execution/tasks/[taskId]">) {
  await requireSession();
  if (!db) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const { taskId } = await context.params;
  const parsed = taskStatusSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const [task] = await db.update(tasks).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(tasks.id, taskId)).returning();
  if (!task) return Response.json({ error: "Task not found." }, { status: 404 });
  return Response.json(task);
}
