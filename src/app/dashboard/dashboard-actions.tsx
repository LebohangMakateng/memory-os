"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type PlannerProposal = {
  assumptions: string[];
  confidentialityNotes: string[];
  milestones: Array<{
    title: string;
    outcome: string;
    tasks: Array<{ title: string; nextAction: string }>;
  }>;
};

type PlannerResult = {
  draft?: { id: string };
  proposal?: PlannerProposal;
  error?: string;
};

async function parseJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : "Request failed.";
    throw new Error(message);
  }
  return body;
}

export function BootstrapButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function bootstrap() {
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch("/api/execution/bootstrap", { method: "POST" }));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not initialize workspace.");
      }
    });
  }

  return <div>
    <button className="rounded-lg bg-[#163c30] px-5 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={pending} onClick={bootstrap} type="button">
      {pending ? "Creating workspace..." : "Create starter workspace"}
    </button>
    {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}
  </div>;
}

export function TaskStatusButton({ taskId, nextStatus, children }: { taskId: string; nextStatus: "todo" | "in_progress" | "done" | "blocked"; children: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function updateTask() {
    startTransition(async () => {
      await parseJson(await fetch(`/api/execution/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      }));
      router.refresh();
    });
  }

  return <button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30] disabled:opacity-60" disabled={pending} onClick={updateTask} type="button">
    {pending ? "Saving..." : children}
  </button>;
}

export function OpportunityForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = data.get("title")?.toString().trim();
    const note = data.get("note")?.toString().trim();
    if (!title) return;
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch("/api/execution/opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, note: note || undefined }),
        }));
        form.reset();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save opportunity.");
      }
    });
  }

  return <form className="mt-5 grid gap-3" onSubmit={submit}>
    <input className="rounded-lg border border-[#cad5cb] bg-white px-3 py-3 text-sm" name="title" placeholder="New opportunity or idea" required />
    <textarea className="min-h-20 rounded-lg border border-[#cad5cb] bg-white px-3 py-3 text-sm" name="note" placeholder="Optional note" />
    <button className="rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={pending} type="submit">
      {pending ? "Saving..." : "Save to inbox"}
    </button>
    {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
  </form>;
}

export function PlanShortcutButton() {
  return <a className="rounded-lg border border-[#cad5cb] px-4 py-2 text-sm font-bold text-[#163c30]" href="/dashboard/planning">Plan with Claude</a>;
}

export function PlannerForm({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setResult(null);
    startTransition(async () => {
      try {
        const body = await parseJson(await fetch("/api/execution/plan-drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, instructions: data.get("instructions")?.toString() || undefined }),
        })) as PlannerResult;
        setResult(body);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not create planning draft.");
      }
    });
  }

  return <div className="rounded-2xl border border-[#dce4dd] bg-white p-7">
    <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">AI PLANNING</p>
    <h2 className="mt-2 font-serif text-2xl">Draft the next project plan.</h2>
    <form className="mt-5 grid gap-3" onSubmit={submit}>
      <textarea id="planner-instructions" className="min-h-24 rounded-lg border border-[#cad5cb] px-3 py-3 text-sm" disabled={!projectId} name="instructions" placeholder={projectId ? "Constraints, deadline, available hours, or outcome..." : "Create a project first."} />
      <button className="rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={pending || !projectId} type="submit">
        {pending ? "Planning..." : "Create draft"}
      </button>
    </form>
    {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}
    {result?.proposal ? <div className="mt-5 rounded-lg bg-[#f5f7f2] p-4">
      <p className="text-sm font-bold text-[#16231e]">Draft created for review</p>
      {result.proposal.milestones.map((milestone) => <div className="mt-3" key={milestone.title}>
        <p className="text-sm font-bold text-[#163c30]">{milestone.title}</p>
        <p className="mt-1 text-xs text-[#64726b]">{milestone.outcome}</p>
        <ul className="mt-2 list-disc pl-5 text-xs text-[#64726b]">
          {milestone.tasks.map((task) => <li key={task.title}>{task.title}</li>)}
        </ul>
      </div>)}
    </div> : null}
  </div>;
}

export function ApproveDraftButton({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function approve() {
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch(`/api/execution/plan-drafts/${draftId}/approve`, { method: "POST" }));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not approve draft.");
      }
    });
  }

  return <div>
    <button className="rounded-lg bg-[#163c30] px-3 py-2 text-xs font-bold text-white disabled:opacity-60" disabled={pending} onClick={approve} type="button">
      {pending ? "Approving..." : "Approve draft"}
    </button>
    {error ? <p className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
  </div>;
}