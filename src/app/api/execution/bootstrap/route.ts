import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";

export const runtime = "nodejs";

function startOfWeek(date = new Date()) {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  result.setHours(0, 0, 0, 0);
  return result.toISOString();
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function POST() {
  await requireSession();
  const supabase = getSupabaseAdmin();
  const existing = await supabase.from("visions").select("id").limit(1);
  fail(existing.error);
  if (existing.data?.length) return Response.json({ error: "Workspace is already initialized." }, { status: 409 });

  const vision = await supabase.from("visions").insert({
    title: "Independent systems builder",
    statement: "Build systems that remove repetitive work, make businesses more efficient, and create financial independence through owned products.",
  }).select("*").single();
  fail(vision.error);

  const goal = await supabase.from("goals").insert({
    vision_id: vision.data.id,
    title: "Create a dependable consulting pipeline",
    description: "Become known for solving automation problems for small and medium businesses.",
    horizon: "1 year",
    success_metric: "A consistent flow of qualified consulting conversations.",
  }).select("*").single();
  fail(goal.error);

  const initiative = await supabase.from("initiatives").insert({
    goal_id: goal.data.id,
    title: "Increase surface area for opportunity",
    why: "Make it easy for the right people to discover the problem I solve and trust the proof of my work.",
    success_metric: "A clear public profile, one published case study, and a weekly outreach rhythm.",
  }).select("*").single();
  fail(initiative.error);

  const project = await supabase.from("projects").insert({
    initiative_id: initiative.data.id,
    title: "Consulting presence",
    purpose: "Position the consultancy, create proof of work, and establish a sustainable outreach habit.",
    share_status: "drafting",
  }).select("*").single();
  fail(project.error);

  const milestoneResult = await supabase.from("milestones").insert([
    { project_id: project.data.id, title: "Positioning", outcome: "A clear one-sentence positioning statement and updated public profile." },
    { project_id: project.data.id, title: "Proof of work", outcome: "A publishable automation case study." },
    { project_id: project.data.id, title: "Outreach rhythm", outcome: "A repeatable list and message for qualified businesses." },
  ]).select("*");
  fail(milestoneResult.error);
  const [positioning, proof, outreach] = milestoneResult.data ?? [];
  if (!positioning || !proof || !outreach) return Response.json({ error: "Could not create starter milestones." }, { status: 500 });

  const week = await supabase.from("weeks").insert({ starts_on: startOfWeek() }).select("*").single();
  fail(week.error);

  const priorityResult = await supabase.from("weekly_priorities").insert([
    { week_id: week.data.id, project_id: project.data.id, title: "Clarify consulting positioning", rank: 1 },
    { week_id: week.data.id, project_id: project.data.id, title: "Create proof of work", rank: 2 },
    { week_id: week.data.id, project_id: project.data.id, title: "Start focused outreach", rank: 3 },
  ]).select("*");
  fail(priorityResult.error);
  const [firstPriority, secondPriority, thirdPriority] = priorityResult.data ?? [];
  if (!firstPriority || !secondPriority || !thirdPriority) return Response.json({ error: "Could not create starter priorities." }, { status: 500 });

  const taskResult = await supabase.from("tasks").insert([
    { milestone_id: positioning.id, weekly_priority_id: firstPriority.id, title: "Write your automation-consultant positioning statement", next_action: "Draft a one-sentence bio naming the SME automation problem you solve.", reason: "A clear problem association makes you easier to discover and recommend.", expected_outcome: "A positioning line ready for your profile and bio.", estimate_minutes: 45, difficulty: 2, energy: "medium", focus_type: "revenue", impact: { revenue: 5, learning: 2, portfolio: 4, automation: 2, enjoyment: 3 }, share_status: "drafting" },
    { milestone_id: proof.id, weekly_priority_id: secondPriority.id, title: "Outline the first automation case study", next_action: "Choose one real workflow and write the problem, intervention, and result headings.", reason: "Businesses trust demonstrated work more than promises; this becomes reusable proof.", expected_outcome: "A case-study outline that can become a public post or portfolio page.", estimate_minutes: 60, difficulty: 3, energy: "medium", focus_type: "portfolio", impact: { revenue: 4, learning: 3, portfolio: 5, automation: 4, enjoyment: 4 }, share_status: "ready_to_share" },
    { milestone_id: outreach.id, weekly_priority_id: thirdPriority.id, title: "Create a five-business outreach list", next_action: "List five businesses where a visible manual workflow could be improved.", reason: "Consistent outreach converts useful proof into real conversations and clients.", expected_outcome: "Five qualified prospects ready for tailored outreach.", estimate_minutes: 30, difficulty: 2, energy: "low", focus_type: "revenue", impact: { revenue: 5, learning: 2, portfolio: 2, automation: 2, enjoyment: 3 }, share_status: "planned" },
  ]);
  fail(taskResult.error);

  return Response.json({ ok: true }, { status: 201 });
}