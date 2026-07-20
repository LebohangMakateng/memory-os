import { requireSession } from "@/lib/auth/session";
import { getExecutionOverview } from "@/lib/execution/overview";
import { impactTotal, recommendNextTask } from "@/lib/execution/recommendation";
import type { ImpactScore, ShareStatus, TaskCandidate } from "@/lib/execution/types";
import {
  ApproveDraftButton,
  BootstrapButton,
  OpportunityForm,
  PlannerForm,
  TaskStatusButton,
} from "./dashboard-actions";

type Overview = Awaited<ReturnType<typeof getExecutionOverview>>;
type OverviewTask = Overview["tasks"][number];

function asImpactScore(value: unknown): ImpactScore {
  const impact = value as Partial<ImpactScore> | null;
  return {
    revenue: Number(impact?.revenue ?? 0),
    learning: Number(impact?.learning ?? 0),
    portfolio: Number(impact?.portfolio ?? 0),
    automation: Number(impact?.automation ?? 0),
    enjoyment: Number(impact?.enjoyment ?? 0),
  };
}

function taskCandidate(task: OverviewTask, weeklyRank: number): TaskCandidate {
  return {
    id: task.id,
    title: task.title,
    nextAction: task.nextAction,
    reason: task.reason,
    weeklyRank,
    dueDate: task.dueDate ?? undefined,
    estimateMinutes: task.estimateMinutes,
    energy: task.energy as TaskCandidate["energy"],
    focusType: task.focusType as TaskCandidate["focusType"],
    impact: asImpactScore(task.impact),
    shareStatus: task.shareStatus as ShareStatus,
    status: task.status as TaskCandidate["status"],
  };
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function formatDate(date: Date | null) {
  if (!date) return "No active week";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function pendingTasks(overview: Overview) {
  const priorityById = new Map(overview.priorities.map((priority) => [priority.id, priority.rank]));
  return overview.tasks
    .filter((task) => task.status !== "done")
    .map((task) => taskCandidate(task, task.weeklyPriorityId ? priorityById.get(task.weeklyPriorityId) ?? 99 : 99));
}

function EmptyWorkspace() {
  return <main className="min-h-screen bg-[#f5f7f2] px-5 py-10 text-[#16231e]">
    <section className="mx-auto grid max-w-3xl gap-6 rounded-2xl border border-[#dce4dd] bg-white p-8">
      <div>
        <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">EXECUTION OS</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Create your starter workspace.</h1>
        <p className="mt-4 text-sm leading-6 text-[#64726b]">Your Supabase database is connected, but there is no execution data yet. This creates the starter vision, goal, project, weekly priorities, and tasks so the app becomes usable immediately.</p>
      </div>
      <BootstrapButton />
    </section>
  </main>;
}

function ConfigError({ message }: { message: string }) {
  return <main className="min-h-screen bg-[#f5f7f2] px-5 py-10 text-[#16231e]">
    <section className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8">
      <p className="text-[10px] font-bold tracking-[.14em] text-red-700">SETUP REQUIRED</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">The app cannot load the database yet.</h1>
      <p className="mt-4 text-sm leading-6 text-[#64726b]">{message}</p>
      <p className="mt-4 rounded-lg bg-[#f5f7f2] p-4 font-mono text-xs">Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and in your deployment environment.</p>
    </section>
  </main>;
}

export default async function DashboardPage() {
  await requireSession();

  let overview: Overview;
  try {
    overview = await getExecutionOverview();
  } catch (error) {
    return <ConfigError message={error instanceof Error ? error.message : "Could not load execution overview."} />;
  }

  if (!overview.vision) return <EmptyWorkspace />;

  const candidates = pendingTasks(overview);
  const next = recommendNextTask(candidates, { availableMinutes: 60, energy: "medium", focus: "revenue" });
  const doneCount = overview.tasks.filter((task) => task.status === "done").length;
  const taskCount = overview.tasks.length;
  const completionPercent = taskCount ? Math.round((doneCount / taskCount) * 100) : 0;
  const activeProject = overview.projects[0];
  const activeGoal = overview.goals[0];
  const activeInitiative = overview.initiatives[0];

  return <main className="min-h-screen bg-[#f5f7f2] text-[#16231e] md:grid md:grid-cols-[236px_1fr]">
    <aside className="hidden min-h-screen flex-col bg-[#163c30] px-5 py-8 text-[#eef5e9] md:flex">
      <a className="mb-14 px-3 text-2xl font-black tracking-[-.12em]" href="/dashboard">E<span className="text-[#d8ef61]">.</span>OS</a>
      <nav className="grid gap-1 text-sm">
        <a className="rounded-lg bg-white/10 px-3 py-3 font-bold" href="#overview">Overview</a>
        <a className="rounded-lg px-3 py-3 text-[#bbcac0]" href="#week">This week</a>
        <a className="rounded-lg px-3 py-3 text-[#bbcac0]" href="#projects">Projects</a>
        <a className="rounded-lg px-3 py-3 text-[#bbcac0]" href="#opportunities">Opportunities</a>
      </nav>
      <div className="mt-auto border-t border-white/15 px-3 pt-5">
        <p className="mb-2 text-[10px] font-bold tracking-[.14em] text-[#9db2a5]">OPERATING PRINCIPLE</p>
        <p className="font-serif text-lg leading-tight">Share everything<br />I build.</p>
      </div>
    </aside>

    <section className="mx-auto w-full max-w-6xl px-5 py-9 md:px-14 md:py-12" id="overview">
      <header className="mb-9 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">EXECUTION OS</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">Make the work visible.</h1>
        </div>
        <a className="rounded-lg border border-[#cad5cb] px-4 py-2 text-sm font-bold text-[#163c30]" href="#planner">Plan with Claude</a>
      </header>

      <section className="mb-6 flex flex-col justify-between gap-5 rounded-2xl bg-[#d8ef61] p-7 lg:flex-row lg:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[.14em] text-[#4d5d26]">CURRENT MISSION</p>
          <h2 className="mt-2 font-serif text-3xl tracking-tight">{overview.vision.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6">{overview.vision.statement}</p>
        </div>
        <p className="text-xs font-bold">{activeGoal?.title ?? "No active goal"} / {activeInitiative?.title ?? "No active initiative"}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.7fr_.8fr]">
        <article className="rounded-2xl border border-[#dce4dd] bg-white p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">YOUR NEXT BEST MOVE</p>
              <h2 className="mt-2 font-serif text-2xl tracking-tight">{next?.task.title ?? "No eligible task right now"}</h2>
            </div>
            {next ? <span className="rounded-full bg-[#edf0e9] px-3 py-1 text-xs font-bold">{next.task.estimateMinutes} min</span> : null}
          </div>
          {next ? <>
            <p className="mt-7 text-sm leading-6"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#64726b]">Next action</span>{next.task.nextAction}</p>
            <div className="mt-5 border-l-[3px] border-[#f0aa72] bg-[#f5f7f2] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64726b]">Why now</p>
              <p className="mt-1 text-sm leading-6">{next.explanation}</p>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <span className="rounded bg-[#eef4d4] px-2 py-1 text-xs font-bold capitalize text-[#3d6729]">{next.task.focusType} focus</span>
              <TaskStatusButton taskId={next.task.id} nextStatus="in_progress">Start task</TaskStatusButton>
            </div>
          </> : <p className="mt-7 text-sm leading-6 text-[#64726b]">Add a task or increase the available time/energy rules in the recommendation logic.</p>}
        </article>

        <article className="flex min-h-56 flex-col rounded-2xl bg-[#163c30] p-7 text-white">
          <p className="text-[10px] font-bold tracking-[.14em] text-[#aac0b4]">WEEKLY COMMITMENT</p>
          <p className="mt-7 font-serif text-6xl leading-none">{doneCount}<span className="ml-2 text-sm font-sans text-[#b7c7bf]">/ {taskCount} done</span></p>
          <div className="mt-6 h-1.5 rounded bg-[#416154]"><div className="h-1.5 rounded bg-[#d8ef61]" style={{ width: `${completionPercent}%` }} /></div>
          <p className="mt-4 text-sm text-[#c2d0c8]">Week of {formatDate(overview.week?.startsOn ?? null)}</p>
          <a className="mt-auto pt-6 text-sm font-bold text-[#d8ef61]" href="#week">Review this week</a>
        </article>
      </section>

      <section className="mt-11" id="week">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">THIS WEEK</p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight">{overview.priorities[0]?.title ?? "No weekly priorities yet"}</h2>
          </div>
          <span className="text-xs font-bold text-[#64726b]">{overview.priorities.length} of 5 priorities</span>
        </div>
        <div className="mt-5 border-t border-[#dce4dd]">
          {overview.tasks.length ? overview.tasks.map((task) => {
            const priority = overview.priorities.find((item) => item.id === task.weeklyPriorityId);
            const impact = asImpactScore(task.impact);
            return <article className="flex flex-wrap items-center gap-3 border-b border-[#dce4dd] py-4" key={task.id}>
              <span className="w-5 font-mono text-xs text-[#64726b]">{priority ? String(priority.rank).padStart(2, "0") : "--"}</span>
              <span className={`h-5 w-5 rounded-full border ${task.status === "done" ? "border-[#163c30] bg-[#163c30]" : "border-[#afbbb2]"}`} />
              <div className="min-w-48 flex-1">
                <h3 className="text-sm font-bold">{task.title}</h3>
                <p className="mt-1 text-xs leading-5 text-[#64726b]">{task.reason}</p>
              </div>
              <span className="rounded bg-[#f0f2ed] px-2 py-1 text-xs font-bold capitalize text-[#64726b]">{statusLabel(task.status)}</span>
              <span className="rounded bg-[#f0f2ed] px-2 py-1 text-xs font-bold capitalize text-[#64726b]">{statusLabel(task.shareStatus)}</span>
              <span className="font-mono text-xs text-[#64726b]">{impactTotal(impact)}/25</span>
              {task.status !== "done" ? <TaskStatusButton taskId={task.id} nextStatus="done">Mark done</TaskStatusButton> : <TaskStatusButton taskId={task.id} nextStatus="todo">Reopen</TaskStatusButton>}
            </article>;
          }) : <p className="py-6 text-sm text-[#64726b]">No tasks yet. Create a plan draft or add seed data.</p>}
        </div>
      </section>

      <section className="mt-11 grid gap-6 md:grid-cols-2" id="projects">
        <article className="rounded-2xl border border-[#dce4dd] bg-[#edf3e9] p-7">
          <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">ACTIVE PROJECT</p>
          <h2 className="mt-2 font-serif text-2xl">{activeProject?.title ?? "No active project"}</h2>
          <p className="mt-3 text-sm leading-6 text-[#64726b]">{activeProject?.purpose ?? "Create a project through the starter workspace or a planning flow."}</p>
          <div className="mt-5 grid gap-3">
            {overview.projects.map((project) => <div className="rounded-lg bg-white/70 p-3" key={project.id}>
              <p className="text-sm font-bold">{project.title}</p>
              <p className="mt-1 text-xs capitalize text-[#64726b]">{statusLabel(project.shareStatus)}</p>
            </div>)}
          </div>
        </article>

        <article className="rounded-2xl border border-[#dce4dd] bg-[#fffdf9] p-7" id="opportunities">
          <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">OPPORTUNITY INBOX</p>
          <h2 className="mt-2 font-serif text-2xl">Ideas are safe here.</h2>
          <div className="mt-4 grid gap-3">
            {overview.opportunities.length ? overview.opportunities.map((opportunity) => <div className="rounded-lg border border-[#eee5d8] bg-white p-3" key={opportunity.id}>
              <p className="text-sm font-bold">{opportunity.title}</p>
              {opportunity.note ? <p className="mt-1 text-xs leading-5 text-[#64726b]">{opportunity.note}</p> : null}
            </div>) : <p className="text-sm text-[#64726b]">No inbox items.</p>}
          </div>
          <OpportunityForm />
        </article>
      </section>

      <section className="mt-11 grid gap-6 lg:grid-cols-[1fr_1fr]" id="planner">
        <PlannerForm projectId={activeProject?.id} />
        <article className="rounded-2xl border border-[#dce4dd] bg-white p-7">
          <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">PENDING DRAFTS</p>
          <h2 className="mt-2 font-serif text-2xl">Review before it changes your plan.</h2>
          <div className="mt-5 grid gap-4">
            {overview.planningDrafts.length ? overview.planningDrafts.map((draft) => {
              const proposal = draft.proposal as { milestones?: Array<{ title: string; tasks?: Array<{ title: string }> }> };
              return <div className="rounded-lg bg-[#f5f7f2] p-4" key={draft.id}>
                <p className="text-sm font-bold">{proposal.milestones?.[0]?.title ?? "Planning draft"}</p>
                <p className="mt-1 text-xs text-[#64726b]">{proposal.milestones?.length ?? 0} milestones ready to approve</p>
                <div className="mt-3"><ApproveDraftButton draftId={draft.id} /></div>
              </div>;
            }) : <p className="text-sm text-[#64726b]">No pending drafts.</p>}
          </div>
        </article>
      </section>
    </section>
  </main>;
}