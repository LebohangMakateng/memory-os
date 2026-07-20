import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { opportunities } from "@/lib/db/schema";
import { opportunitySchema } from "@/lib/execution/validation";

export const runtime = "nodejs";

export async function GET() {
  await requireSession();
  if (!db) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  return Response.json(await db.select().from(opportunities).where(eq(opportunities.status, "inbox")).orderBy(desc(opportunities.createdAt)));
}

export async function POST(request: Request) {
  await requireSession();
  if (!db) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const parsed = opportunitySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const [opportunity] = await db.insert(opportunities).values(parsed.data).returning();
  return Response.json(opportunity, { status: 201 });
}
