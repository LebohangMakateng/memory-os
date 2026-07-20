import { db } from "@/lib/db/client";
import { requireSession } from "@/lib/auth/session";
import { goals, initiatives, milestones, projects, tasks, visions, weeklyPriorities, weeks } from "@/lib/db/schema";

export const runtime = "nodejs";

function startOfWeek(date = new Date()) {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  result.setHours(0, 0, 0, 0);
  return result;
}

export async function POST() {
  await requireSession();
  if (!db) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const existing = await db.select({ id: visions.id }).from(visions).limit(1);
  if (existing.length) return Response.json({ error: "Workspace is already initialized." }, { status: 409 });

  const [vision] = await db.insert(visions).values({
    title: "Independent systems builder",
    statement: "Build systems that remove repetitive work, make businesses more efficient, and create financial independence through owned products.",
  }).returning();
  const [goal] = await db.insert(goals).values({
    visionId: vision.id,
    title: "Create a dependable consulting pipeline",
    description: "Become known for solving automation problems for small and medium businesses.",
    horizon: "1 year",
    successMetric: "A consistent flow of qualified consulting conversations.",
  }).returning();
  const [initiative] = await db.insert(initiatives).values({
    goalId: goal.id,
    title: "Increase surface area for opportunity",
    why: "Make it easy for the right people to discover the problem I solve and trust the proof of my work.",
    successMetric: "A clear public profile, one published case study, and a weekly outreach rhythm.",
  }).returning();
  const [project] = await db.insert(projects).values({
    initiativeId: initiative.id,
    title: "Consulting presence",
    purpose: "Position the consultancy, create proof of work, and establish a sustainable outreach habit.",
    shareStatus: "drafting",
  }).returning();
  const [positioning, proof, outreach] = await db.insert(milestones).values([
    { projectId: project.id, title: "Positioning", outcome: "A clear one-sentence positioning statement and updated public profile." },
    { projectId: project.id, title: "Proof of work", outcome: "A publishable automation case study." },
    { projectId: project.id, title: "Outreach rhythm", outcome: "A repeatable list and message for qualified businesses." },
  ]).returning();
  const [week] = await db.insert(weeks).values({ startsOn: startOfWeek() }).returning();
  const [firstPriority, secondPriority, thirdPriority] = await db.insert(weeklyPriorities).values([
    { weekId: week.id, projectId: project.id, title: "Clarify consulting positioning", rank: 1 },
    { weekId: week.id, projectId: project.id, title: "Create proof of work", rank: 2 },
    { weekId: week.id, projectId: project.id, title: "Start focused outreach", rank: 3 },
  ]).returning();
  await db.insert(tasks).values([
    { milestoneId: positioning.id, weeklyPriorityId: firstPriority.id, title: "Write your automation-consultant positioning statement", nextAction: "Draft a one-sentence bio naming the SME automation problem you solve.", reason: "A clear problem association makes you easier to discover and recommend.", expectedOutcome: "A positioning line ready for your profile and bio.", estimateMinutes: 45, difficulty: 2, energy: "medium", focusType: "revenue", impact: { revenue: 5, learning: 2, portfolio: 4, automation: 2, enjoyment: 3 }, shareStatus: "drafting" },
    { milestoneId: proof.id, weeklyPriorityId: secondPriority.id, title: "Outline the first automation case study", nextAction: "Choose one real workflow and write the problem, intervention, and result headings.", reason: "Businesses trust demonstrated work more than promises; this becomes reusable proof.", expectedOutcome: "A case-study outline that can become a public post or portfolio page.", estimateMinutes: 60, difficulty: 3, energy: "medium", focusType: "portfolio", impact: { revenue: 4, learning: 3, portfolio: 5, automation: 4, enjoyment: 4 }, shareStatus: "ready_to_share" },
    { milestoneId: outreach.id, weeklyPriorityId: thirdPriority.id, title: "Create a five-business outreach list", nextAction: "List five businesses where a visible manual workflow could be improved.", reason: "Consistent outreach converts useful proof into real conversations and clients.", expectedOutcome: "Five qualified prospects ready for tailored outreach.", estimateMinutes: 30, difficulty: 2, energy: "low", focusType: "revenue", impact: { revenue: 5, learning: 2, portfolio: 2, automation: 2, enjoyment: 3 }, shareStatus: "planned" },
  ]);
  return Response.json({ ok: true }, { status: 201 });
}
