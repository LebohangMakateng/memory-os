"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { statusLabel } from "../_components/format";

type Milestone = { id: string; projectId: string; title: string; outcome: string };
type Priority = { id: string; title: string; projectId: string | null; rank: number };
export type WeeklyTaskManagerTask = { id: string; milestoneId: string; weeklyPriorityId: string | null; title: string; description: string | null; nextAction: string; reason: string; expectedOutcome: string; status: string; dueDate: Date | null; estimateMinutes: number; difficulty: number; energy: string; focusType: string; shareStatus: string };
type Task = WeeklyTaskManagerTask;

const inputClass = "rounded-lg border border-[#cad5cb] bg-white px-3 py-2 text-sm";
const textAreaClass = inputClass + " min-h-16";
const labelClass = "grid gap-1 text-xs font-bold text-[#32443a]";
const primaryButton = "rounded-lg bg-[#163c30] px-4 py-2 text-sm font-bold text-white disabled:opacity-60";
const secondaryButton = "rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30] disabled:opacity-60";
function PlusIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
}

function XIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}

function ChevronDownIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>;
}

function ChevronUpIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6" /></svg>;
}


async function parseJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Request failed.");
  return body;
}

function dateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function isoDate(value: FormDataEntryValue | null) {
  const date = value?.toString();
  return date ? new Date(date + "T12:00:00.000Z").toISOString() : null;
}

function taskPayload(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    milestoneId: data.get("milestoneId")?.toString() ?? "",
    weeklyPriorityId: data.get("weeklyPriorityId")?.toString() || null,
    title: data.get("title")?.toString().trim() ?? "",
    description: data.get("description")?.toString().trim() || null,
    nextAction: data.get("nextAction")?.toString().trim() ?? "",
    reason: data.get("reason")?.toString().trim() ?? "",
    expectedOutcome: data.get("expectedOutcome")?.toString().trim() ?? "",
    status: data.get("status")?.toString() ?? "todo",
    dueDate: isoDate(data.get("dueDate")),
    estimateMinutes: Number(data.get("estimateMinutes") || 45),
    difficulty: Number(data.get("difficulty") || 3),
    energy: data.get("energy")?.toString() ?? "medium",
    focusType: data.get("focusType")?.toString() ?? "maintenance",
    shareStatus: data.get("shareStatus")?.toString() ?? "planned",
  };
}

function TaskFields({ milestones, priorities, task }: { milestones: Milestone[]; priorities: Priority[]; task?: Task }) {
  return <>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={labelClass}>Milestone<select className={inputClass} defaultValue={task?.milestoneId ?? ""} name="milestoneId" required><option value="">Choose milestone</option>{milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select></label>
      <label className={labelClass}>Weekly priority<select className={inputClass} defaultValue={task?.weeklyPriorityId ?? ""} name="weeklyPriorityId"><option value="">None</option>{priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.rank}. {priority.title}</option>)}</select></label>
    </div>
    <label className={labelClass}>Title<input className={inputClass} defaultValue={task?.title} name="title" required /></label>
    <label className={labelClass}>Description<textarea className={textAreaClass} defaultValue={task?.description ?? ""} name="description" /></label>
    <label className={labelClass}>Next action<textarea className={textAreaClass} defaultValue={task?.nextAction} name="nextAction" required /></label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={labelClass}>Reason<textarea className={textAreaClass} defaultValue={task?.reason} name="reason" required /></label>
      <label className={labelClass}>Expected outcome<textarea className={textAreaClass} defaultValue={task?.expectedOutcome} name="expectedOutcome" required /></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className={labelClass}>Status<select className={inputClass} defaultValue={task?.status ?? "todo"} name="status"><option value="todo">Planned</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option></select></label>
      <label className={labelClass}>Estimate<input className={inputClass} defaultValue={task?.estimateMinutes ?? 45} min={15} max={480} name="estimateMinutes" step={15} type="number" required /></label>
      <label className={labelClass}>Due date<input className={inputClass} defaultValue={dateValue(task?.dueDate ?? null)} name="dueDate" type="date" /></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-4">
      <label className={labelClass}>Difficulty<input className={inputClass} defaultValue={task?.difficulty ?? 3} min={1} max={5} name="difficulty" type="number" /></label>
      <label className={labelClass}>Energy<select className={inputClass} defaultValue={task?.energy ?? "medium"} name="energy"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      <label className={labelClass}>Focus<select className={inputClass} defaultValue={task?.focusType ?? "maintenance"} name="focusType"><option value="revenue">Revenue</option><option value="learning">Learning</option><option value="portfolio">Portfolio</option><option value="maintenance">Maintenance</option></select></label>
      <label className={labelClass}>Share<select className={inputClass} defaultValue={task?.shareStatus ?? "planned"} name="shareStatus"><option value="planned">Planned</option><option value="drafting">Drafting</option><option value="ready_to_share">Ready</option><option value="shared">Shared</option><option value="not_applicable">N/a</option></select></label>
    </div>
  </>;
}

export function WeeklyTaskManager({ milestones, priorities, tasks }: { milestones: Milestone[]; priorities: Priority[]; tasks: Task[] }) {
  const router = useRouter();
  const [addingTask, setAddingTask] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const milestoneById = useMemo(() => new Map(milestones.map((milestone) => [milestone.id, milestone])), [milestones]);
  const priorityById = useMemo(() => new Map(priorities.map((priority) => [priority.id, priority])), [priorities]);

  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch("/api/execution/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskPayload(form)) }));
        form.reset();
        setAddingTask(false);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not create task.");
      }
    });
  }

  function updateTask(event: FormEvent<HTMLFormElement>, taskId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    setPendingId(taskId);
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch("/api/execution/tasks/" + taskId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskPayload(form)) }));
        setEditingId("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not update task.");
      } finally {
        setPendingId("");
      }
    });
  }

  function updateStatus(taskId: string, status: string) {
    setPendingId(taskId);
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch("/api/execution/tasks/" + taskId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not update task.");
      } finally {
        setPendingId("");
      }
    });
  }

  function deleteTask(taskId: string) {
    setPendingId(taskId);
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch("/api/execution/tasks/" + taskId, { method: "DELETE" }));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not delete task.");
      } finally {
        setPendingId("");
      }
    });
  }

  return <section className="grid gap-6">
    {tasksOpen ? <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">TASKS</p><h2 className="mt-2 font-serif text-2xl text-[#16231e]">Weekly tasks</h2></div>
        <div className="flex gap-2">
          {!addingTask ? <button aria-label="Add weekly task" className="grid size-10 place-items-center rounded-lg bg-[#163c30] text-white" onClick={() => setAddingTask(true)} title="Add weekly task" type="button"><PlusIcon /></button> : null}
          <button aria-label="Hide weekly tasks" className="grid size-10 place-items-center rounded-lg border border-[#cad5cb] text-[#163c30]" onClick={() => setTasksOpen(false)} title="Hide weekly tasks" type="button"><ChevronUpIcon /></button>
        </div>
      </div>

      {addingTask ? <form className="mb-5 grid gap-4 rounded-xl bg-[#f5f7f2] p-4" onSubmit={createTask}>
        <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-serif text-xl text-[#16231e]">Add weekly task</h3><button aria-label="Close add weekly task form" className="grid size-9 place-items-center rounded-lg border border-[#cad5cb] bg-white text-[#163c30]" onClick={() => setAddingTask(false)} title="Close add weekly task form" type="button"><XIcon /></button></div>
        <TaskFields milestones={milestones} priorities={priorities} />
        <button className={primaryButton} disabled={pending || !milestones.length} type="submit">{pending ? "Saving..." : "Create task"}</button>
        {!milestones.length ? <p className="text-sm text-[#64726b]">Create a project milestone before adding tasks.</p> : null}
      </form> : null}

      <div className="grid gap-3">
        {tasks.length ? tasks.map((task) => {
          const milestone = milestoneById.get(task.milestoneId);
          const priority = task.weeklyPriorityId ? priorityById.get(task.weeklyPriorityId) : null;
          const priorityLabel = priority ? " / " + priority.title : "";
          return <article className="rounded-xl border border-[#dce4dd] bg-[#f5f7f2] p-4" key={task.id}>
            {editingId === task.id ? <form className="grid gap-3" onSubmit={(event) => updateTask(event, task.id)}>
              <TaskFields milestones={milestones} priorities={priorities} task={task} />
              <div className="flex flex-wrap gap-2"><button className={primaryButton} disabled={pendingId === task.id} type="submit">{pendingId === task.id ? "Saving..." : "Save"}</button><button className={secondaryButton} onClick={() => setEditingId("")} type="button">Cancel</button></div>
            </form> : <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">{statusLabel(task.status)} / {task.estimateMinutes} min / {task.energy}</p><h3 className="mt-1 text-base font-bold">{task.title}</h3><p className="mt-1 text-xs text-[#64726b]">{milestone?.title ?? "No milestone"}{priorityLabel}</p></div>
                <div className="flex flex-wrap gap-2"><button className={secondaryButton} disabled={pendingId === task.id} onClick={() => updateStatus(task.id, task.status === "done" ? "todo" : "done")} type="button">{task.status === "done" ? "Reopen" : "Done"}</button><button className={secondaryButton} onClick={() => setEditingId(task.id)} type="button">Edit</button><button className="rounded-lg border border-[#d7c0bb] px-3 py-2 text-xs font-bold text-[#8f2f1f] disabled:opacity-60" disabled={pendingId === task.id} onClick={() => deleteTask(task.id)} type="button">Delete</button></div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#64726b]">{task.nextAction}</p>
            </>}
          </article>;
        }) : <div className="rounded-xl bg-[#f5f7f2] p-4 text-sm text-[#64726b]">No weekly tasks yet.</div>}
      </div>
    </article> : <button className="flex items-center justify-between gap-4 rounded-2xl border border-[#dce4dd] bg-white p-7 text-left" onClick={() => setTasksOpen(true)} type="button">
      <span><span className="block text-[10px] font-bold tracking-[.14em] text-[#64726b]">TASKS</span><span className="mt-2 block font-serif text-2xl text-[#16231e]">Weekly tasks</span></span>
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#163c30] text-white"><ChevronDownIcon /></span>
    </button>}
    {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
  </section>;
}
