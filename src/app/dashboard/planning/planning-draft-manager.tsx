"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Impact = { revenue: number; learning: number; portfolio: number; automation: number; enjoyment: number };
type ProposalTask = { title: string; nextAction: string; reason: string; expectedOutcome: string; estimateMinutes: number; energy: "low" | "medium" | "high"; focusType: "revenue" | "learning" | "portfolio" | "maintenance"; impact: Impact; shareRecommendation: string };
type ProposalMilestone = { title: string; outcome: string; tasks: ProposalTask[] };
type Proposal = { assumptions: string[]; confidentialityNotes: string[]; milestones: ProposalMilestone[] };
type Draft = { id: string; proposal: unknown; prompt: string | null };

const inputClass = "rounded-lg border border-[#cad5cb] bg-white px-3 py-2 text-sm";
const textAreaClass = inputClass + " min-h-16";
const labelClass = "grid gap-1 text-xs font-bold text-[#32443a]";
const primaryButton = "rounded-lg bg-[#163c30] px-4 py-2 text-sm font-bold text-white disabled:opacity-60";
const secondaryButton = "rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30] disabled:opacity-60";

const defaultImpact: Impact = { revenue: 3, learning: 3, portfolio: 3, automation: 2, enjoyment: 3 };

async function parseJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Request failed.");
  return body;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function asImpact(value: unknown): Impact {
  const impact = value && typeof value === "object" ? value as Partial<Impact> : {};
  return {
    revenue: Number(impact.revenue ?? defaultImpact.revenue),
    learning: Number(impact.learning ?? defaultImpact.learning),
    portfolio: Number(impact.portfolio ?? defaultImpact.portfolio),
    automation: Number(impact.automation ?? defaultImpact.automation),
    enjoyment: Number(impact.enjoyment ?? defaultImpact.enjoyment),
  };
}

function asProposal(value: unknown): Proposal {
  const root = value && typeof value === "object" ? value as Partial<Proposal> : {};
  const milestones = Array.isArray(root.milestones) ? root.milestones : [];
  return {
    assumptions: asStringArray(root.assumptions),
    confidentialityNotes: asStringArray(root.confidentialityNotes),
    milestones: milestones.map((milestoneValue) => {
      const milestone = milestoneValue && typeof milestoneValue === "object" ? milestoneValue as Partial<ProposalMilestone> : {};
      const tasks = Array.isArray(milestone.tasks) ? milestone.tasks : [];
      return {
        title: String(milestone.title ?? "Untitled milestone"),
        outcome: String(milestone.outcome ?? "Deliver a concrete project outcome."),
        tasks: tasks.map((taskValue) => {
          const task = taskValue && typeof taskValue === "object" ? taskValue as Partial<ProposalTask> : {};
          return {
            title: String(task.title ?? "Untitled task"),
            nextAction: String(task.nextAction ?? "Define the next concrete action."),
            reason: String(task.reason ?? "This task moves the project forward."),
            expectedOutcome: String(task.expectedOutcome ?? milestone.outcome ?? "Concrete progress."),
            estimateMinutes: Number(task.estimateMinutes ?? 45),
            energy: ["low", "medium", "high"].includes(String(task.energy)) ? task.energy as ProposalTask["energy"] : "medium",
            focusType: ["revenue", "learning", "portfolio", "maintenance"].includes(String(task.focusType)) ? task.focusType as ProposalTask["focusType"] : "maintenance",
            impact: asImpact(task.impact),
            shareRecommendation: String(task.shareRecommendation ?? "Share the public-safe artifact or lesson."),
          };
        }),
      };
    }),
  };
}

function field(form: FormData, name: string) {
  return form.get(name)?.toString().trim() ?? "";
}

function proposalFromForm(form: HTMLFormElement, current: Proposal) {
  const data = new FormData(form);
  return {
    assumptions: current.assumptions,
    confidentialityNotes: current.confidentialityNotes,
    milestones: current.milestones.map((milestone, milestoneIndex) => ({
      title: field(data, "milestone-" + milestoneIndex + "-title"),
      outcome: field(data, "milestone-" + milestoneIndex + "-outcome"),
      tasks: milestone.tasks.map((task, taskIndex) => ({
        title: field(data, "task-" + milestoneIndex + "-" + taskIndex + "-title"),
        nextAction: field(data, "task-" + milestoneIndex + "-" + taskIndex + "-nextAction"),
        reason: field(data, "task-" + milestoneIndex + "-" + taskIndex + "-reason"),
        expectedOutcome: field(data, "task-" + milestoneIndex + "-" + taskIndex + "-expectedOutcome"),
        estimateMinutes: Number(data.get("task-" + milestoneIndex + "-" + taskIndex + "-estimateMinutes") || task.estimateMinutes),
        energy: data.get("task-" + milestoneIndex + "-" + taskIndex + "-energy")?.toString() as ProposalTask["energy"],
        focusType: data.get("task-" + milestoneIndex + "-" + taskIndex + "-focusType")?.toString() as ProposalTask["focusType"],
        impact: task.impact,
        shareRecommendation: field(data, "task-" + milestoneIndex + "-" + taskIndex + "-shareRecommendation"),
      })),
    })),
  };
}

function DraftCard({ draft }: { draft: Draft }) {
  const router = useRouter();
  const proposal = asProposal(draft.proposal);
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function saveDraft(form: HTMLFormElement, approve: boolean) {
    const nextProposal = proposalFromForm(form, proposal);
    setPendingAction(approve ? "approve" : "save");
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch("/api/execution/plan-drafts/" + draft.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal: nextProposal }),
        }));
        if (approve) await parseJson(await fetch("/api/execution/plan-drafts/" + draft.id + "/approve", { method: "POST" }));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save draft.");
      } finally {
        setPendingAction("");
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveDraft(event.currentTarget, false);
  }

  return <form className="grid gap-5 rounded-2xl border border-[#dce4dd] bg-white p-7" onSubmit={submit}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">DRAFT</p><h2 className="mt-2 font-serif text-2xl">{proposal.milestones[0]?.title ?? "Planning draft"}</h2>{draft.prompt ? <p className="mt-2 text-xs text-[#64726b]">{draft.prompt}</p> : null}</div>
      <div className="flex flex-wrap gap-2"><button className={secondaryButton} disabled={Boolean(pendingAction)} type="submit">{pendingAction === "save" ? "Saving..." : "Save draft"}</button><button className={primaryButton} disabled={Boolean(pendingAction)} onClick={(event) => saveDraft(event.currentTarget.form as HTMLFormElement, true)} type="button">{pendingAction === "approve" ? "Approving..." : "Save + approve"}</button></div>
    </div>
    {proposal.assumptions.length ? <div className="rounded-lg bg-[#f5f7f2] p-3"><p className="text-xs font-bold text-[#64726b]">Assumptions</p><ul className="mt-2 list-disc pl-5 text-xs text-[#64726b]">{proposal.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
    {proposal.confidentialityNotes.length ? <div className="rounded-lg bg-[#f5f7f2] p-3"><p className="text-xs font-bold text-[#64726b]">Confidentiality notes</p><ul className="mt-2 list-disc pl-5 text-xs text-[#64726b]">{proposal.confidentialityNotes.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
    <div className="grid gap-5">
      {proposal.milestones.map((milestone, milestoneIndex) => <section className="grid gap-3 rounded-lg bg-[#f5f7f2] p-4" key={milestoneIndex}>
        <label className={labelClass}>Milestone title<input className={inputClass} defaultValue={milestone.title} name={"milestone-" + milestoneIndex + "-title"} required /></label>
        <label className={labelClass}>Milestone outcome<textarea className={textAreaClass} defaultValue={milestone.outcome} name={"milestone-" + milestoneIndex + "-outcome"} required /></label>
        <div className="grid gap-3">
          {milestone.tasks.map((task, taskIndex) => <div className="grid gap-3 rounded-lg border border-[#dce4dd] bg-white p-4" key={taskIndex}>
            <label className={labelClass}>Task title<input className={inputClass} defaultValue={task.title} name={"task-" + milestoneIndex + "-" + taskIndex + "-title"} required /></label>
            <label className={labelClass}>Next action<textarea className={textAreaClass} defaultValue={task.nextAction} name={"task-" + milestoneIndex + "-" + taskIndex + "-nextAction"} required /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Reason<textarea className={textAreaClass} defaultValue={task.reason} name={"task-" + milestoneIndex + "-" + taskIndex + "-reason"} required /></label><label className={labelClass}>Expected outcome<textarea className={textAreaClass} defaultValue={task.expectedOutcome} name={"task-" + milestoneIndex + "-" + taskIndex + "-expectedOutcome"} required /></label></div>
            <div className="grid gap-3 sm:grid-cols-3"><label className={labelClass}>Estimate<input className={inputClass} defaultValue={task.estimateMinutes} min={15} max={480} name={"task-" + milestoneIndex + "-" + taskIndex + "-estimateMinutes"} step={15} type="number" /></label><label className={labelClass}>Energy<select className={inputClass} defaultValue={task.energy} name={"task-" + milestoneIndex + "-" + taskIndex + "-energy"}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className={labelClass}>Focus type<select className={inputClass} defaultValue={task.focusType} name={"task-" + milestoneIndex + "-" + taskIndex + "-focusType"}><option value="revenue">Revenue</option><option value="learning">Learning</option><option value="portfolio">Portfolio</option><option value="maintenance">Maintenance</option></select></label></div>
            <label className={labelClass}>Share recommendation<textarea className={textAreaClass} defaultValue={task.shareRecommendation} name={"task-" + milestoneIndex + "-" + taskIndex + "-shareRecommendation"} /></label>
          </div>)}
        </div>
      </section>)}
    </div>
    {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
  </form>;
}

export function PlanningDraftManager({ drafts }: { drafts: Draft[] }) {
  if (!drafts.length) return <article className="rounded-2xl border border-[#dce4dd] bg-white p-7"><h2 className="font-serif text-2xl">Pending drafts</h2><p className="mt-5 text-sm text-[#64726b]">No pending drafts.</p></article>;
  return <section className="grid gap-5">{drafts.map((draft) => <DraftCard draft={draft} key={draft.id} />)}</section>;
}
