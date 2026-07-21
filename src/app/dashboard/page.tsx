import { recommendNextTask } from "@/lib/execution/recommendation";
import { PlanShortcutButton, TaskStatusButton } from "./dashboard-actions";
import { ConfigErrorCard, DashboardShell, EmptyWorkspaceCard, PageHeader } from "./_components/shell";
import { formatDate, loadOverview, taskCandidate } from "./_components/data";

export default async function DashboardPage() {
  const { overview, error } = await loadOverview();
  if (error) return <ConfigErrorCard message={error} />;
  if (!overview?.vision) return <EmptyWorkspaceCard />;

  const priorityById = new Map(overview.priorities.map((priority) => [priority.id, priority.rank]));
  const candidates = overview.tasks
    .filter((task) => task.status !== "done")
    .map((task) => taskCandidate(task, task.weeklyPriorityId ? priorityById.get(task.weeklyPriorityId) ?? 99 : 99));
  const next = recommendNextTask(candidates, { availableMinutes: 60, energy: "medium", focus: "revenue" });
  const doneCount = overview.tasks.filter((task) => task.status === "done").length;
  const taskCount = overview.tasks.length;
  const completionPercent = taskCount ? Math.round((doneCount / taskCount) * 100) : 0;
  const activeProject = overview.projects[0];
  const activeGoal = overview.goals[0];
  const activeInitiative = overview.initiatives[0];

  return <DashboardShell active="Overview">
    <PageHeader eyebrow="EXECUTION OS" title="Overview" action={<PlanShortcutButton />}>
      See the current mission, next best task, and the operational state of the week.
    </PageHeader>

    <section className="mb-6 rounded-2xl bg-[#d8ef61] p-7">
      <p className="text-[10px] font-bold tracking-[.14em] text-[#4d5d26]">CURRENT MISSION</p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight">{overview.vision.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6">{overview.vision.statement}</p>
      <p className="mt-5 text-xs font-bold">{activeGoal?.title ?? "No active goal"} / {activeInitiative?.title ?? "No active initiative"}</p>
    </section>

    <section className="grid gap-6 lg:grid-cols-[1.6fr_.9fr]">
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
        </> : <p className="mt-7 text-sm leading-6 text-[#64726b]">Add tasks from the planning page or initialize the workspace.</p>}
      </article>

      <article className="flex min-h-56 flex-col rounded-2xl bg-[#163c30] p-7 text-white">
        <p className="text-[10px] font-bold tracking-[.14em] text-[#aac0b4]">WEEKLY COMMITMENT</p>
        <p className="mt-7 font-serif text-6xl leading-none">{doneCount}<span className="ml-2 text-sm font-sans text-[#b7c7bf]">/ {taskCount} done</span></p>
        <div className="mt-6 h-1.5 rounded bg-[#416154]"><div className="h-1.5 rounded bg-[#d8ef61]" style={{ width: `${completionPercent}%` }} /></div>
        <p className="mt-4 text-sm text-[#c2d0c8]">Week of {formatDate(overview.week?.startsOn ?? null)}</p>
        <a className="mt-auto pt-6 text-sm font-bold text-[#d8ef61]" href="/dashboard/week">Open weekly planning</a>
      </article>
    </section>

    <section className="mt-6 grid gap-6 md:grid-cols-3">
      <a className="rounded-2xl border border-[#dce4dd] bg-white p-5" href="/dashboard/projects"><p className="text-3xl font-bold">{overview.projects.length}</p><p className="mt-1 text-sm font-bold">Active projects</p><p className="mt-2 text-xs text-[#64726b]">{activeProject?.title ?? "Create a project"}</p></a>
      <a className="rounded-2xl border border-[#dce4dd] bg-white p-5" href="/dashboard/opportunities"><p className="text-3xl font-bold">{overview.opportunities.length}</p><p className="mt-1 text-sm font-bold">Inbox ideas</p><p className="mt-2 text-xs text-[#64726b]">Capture without switching focus.</p></a>
      <a className="rounded-2xl border border-[#dce4dd] bg-white p-5" href="/dashboard/planning"><p className="text-3xl font-bold">{overview.planningDrafts.length}</p><p className="mt-1 text-sm font-bold">Pending drafts</p><p className="mt-2 text-xs text-[#64726b]">Review before approval.</p></a>
    </section>
  </DashboardShell>;
}