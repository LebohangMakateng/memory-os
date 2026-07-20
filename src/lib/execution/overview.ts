import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  goals,
  initiatives,
  milestones,
  opportunities,
  projects,
  tasks,
  visions,
  weeklyPriorities,
  weeks,
} from "@/lib/db/schema";

export async function getExecutionOverview() {
  if (!db) throw new Error("DATABASE_URL is not configured.");
  const [visionRows, goalRows, initiativeRows, projectRows, milestoneRows, weekRows, priorityRows, taskRows, opportunityRows] = await Promise.all([
    db.select().from(visions).where(eq(visions.isActive, true)),
    db.select().from(goals).where(eq(goals.status, "active")),
    db.select().from(initiatives).where(eq(initiatives.status, "active")),
    db.select().from(projects).where(eq(projects.status, "active")),
    db.select().from(milestones).where(eq(milestones.status, "planned")),
    db.select().from(weeks).orderBy(desc(weeks.startsOn)).limit(1),
    db.select().from(weeklyPriorities).orderBy(weeklyPriorities.rank),
    db.select().from(tasks).where(eq(tasks.status, "todo")),
    db.select().from(opportunities).where(eq(opportunities.status, "inbox")).orderBy(desc(opportunities.createdAt)),
  ]);
  const activeWeek = weekRows[0] ?? null;
  return {
    vision: visionRows[0] ?? null,
    goals: goalRows,
    initiatives: initiativeRows,
    projects: projectRows,
    milestones: milestoneRows,
    week: activeWeek,
    priorities: activeWeek ? priorityRows.filter((priority) => priority.weekId === activeWeek.id) : [],
    tasks: taskRows,
    opportunities: opportunityRows,
  };
}
