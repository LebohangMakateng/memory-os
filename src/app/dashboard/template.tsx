"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

type PlannerResponse = {
  proposal?: { milestones: Array<{ title: string; tasks: Array<{ title: string }> }> };
  error?: string;
};

export default function DashboardTemplate({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<"planner" | "opportunity" | null>(null);
  const [message, setMessage] = useState("");
  const [planning, setPlanning] = useState(false);
  const [proposal, setProposal] = useState<PlannerResponse["proposal"]>();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest("button");
      if (!button) return;
      const label = button.textContent?.trim() ?? "";
      if (label.startsWith("Start task")) {
        button.textContent = "Task in progress";
        button.classList.add("opacity-80");
        localStorage.setItem("execution-os-active-task", "positioning");
        setMessage("Task started. Keep the next action small and visible.");
      }
      if (label.startsWith("Plan with Claude")) setModal("planner");
      if (label.startsWith("Capture an opportunity")) setModal("opportunity");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function planWithClaude(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanning(true);
    setProposal(undefined);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/ai/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "initiative",
          targetTitle: "Increase surface area for opportunity",
          targetPurpose: "Become easier to discover as an automation consultant by showing useful work in public and creating a repeatable outreach rhythm.",
          instructions: form.get("instructions")?.toString(),
        }),
      });
      const result = (await response.json()) as PlannerResponse;
      if (!response.ok || !result.proposal) throw new Error(result.error ?? "Claude could not prepare a plan.");
      setProposal(result.proposal);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Claude could not prepare a plan.");
    } finally {
      setPlanning(false);
    }
  }

  function captureOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = form.get("title")?.toString().trim();
    if (!title) return;
    const existing = JSON.parse(localStorage.getItem("execution-os-opportunities") ?? "[]") as string[];
    localStorage.setItem("execution-os-opportunities", JSON.stringify([title, ...existing]));
    setModal(null);
    setMessage(`“${title}” is safely in your opportunity inbox for the next weekly review.`);
  }

  return <>
    {children}
    <div aria-live="polite" className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg bg-[#163c30] px-4 py-3 text-sm text-white shadow-lg empty:hidden">{message}</div>
    {modal && <div className="fixed inset-0 z-50 grid place-items-center bg-[#16231e]/45 p-5" role="dialog" aria-modal="true" aria-label={modal === "planner" ? "Plan with Claude" : "Capture opportunity"}>
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">{modal === "planner" ? "CLAUDE PLANNING" : "OPPORTUNITY INBOX"}</p><h2 className="mt-2 font-serif text-3xl text-[#16231e]">{modal === "planner" ? "Turn direction into a plan." : "Capture it. Don’t switch context."}</h2></div><button className="rounded p-2 text-xl text-[#64726b]" onClick={() => setModal(null)} aria-label="Close">×</button></div>
        {modal === "planner" ? <form className="mt-6" onSubmit={planWithClaude}><label className="block text-sm font-bold text-[#16231e]" htmlFor="instructions">What should Claude account for?</label><textarea className="mt-2 min-h-28 w-full rounded-lg border border-[#cad5cb] p-3 text-sm" id="instructions" name="instructions" placeholder="For example: I have 5 hours this week and need a publishable result by Friday." /><p className="mt-3 text-xs leading-5 text-[#64726b]">Claude will draft milestones and tasks for review. Nothing is saved automatically.</p><button className="mt-5 rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={planning} type="submit">{planning ? "Planning…" : "Create reviewable plan"}</button>{proposal && <div className="mt-6 rounded-lg bg-[#f5f7f2] p-4"><p className="text-sm font-bold">Claude’s draft</p>{proposal.milestones.map((milestone) => <div className="mt-3" key={milestone.title}><p className="text-sm font-bold text-[#163c30]">{milestone.title}</p><ul className="mt-1 list-disc pl-5 text-sm text-[#64726b]">{milestone.tasks.map((task) => <li key={task.title}>{task.title}</li>)}</ul></div>)}</div>}</form> : <form className="mt-6" onSubmit={captureOpportunity}><label className="block text-sm font-bold text-[#16231e]" htmlFor="title">Opportunity or idea</label><input className="mt-2 w-full rounded-lg border border-[#cad5cb] p-3 text-sm" id="title" name="title" autoFocus placeholder="e.g. WhatsApp follow-up automation" required /><p className="mt-3 text-xs leading-5 text-[#64726b]">It will stay out of this week’s execution list until you review it.</p><button className="mt-5 rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white" type="submit">Save to inbox</button></form>}
      </div>
    </div>}
  </>;
}
