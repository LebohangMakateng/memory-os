"use client";

import { useEffect, useState } from "react";

type Target = { id: string; label: string; done: boolean };
type WeeklyPlan = {
  id: string;
  weekStart: string;
  weekLabel: string;
  focus: string;
  focusBullets: string[];
  mainBuild: string;
  definitionOfDone: string[];
  weeklyTargets: Target[];
  updatedAt: string;
};

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSundayWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return toDateOnly(start);
}

async function parseJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body && typeof body === "object" && "error" in body ? body.error : null;
    throw new Error(typeof error === "string" ? error : "Request failed.");
  }
  return body;
}

export function WeeklyHistoryList() {
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentWeekStart = getSundayWeekStart(new Date());
    let active = true;

    fetch(`/api/execution/weekly-plan?history=1&before=${currentWeekStart}`)
      .then(parseJson)
      .then((history: WeeklyPlan[]) => {
        if (!active) return;
        setPlans(history);
        setLoading(false);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Could not load weekly history.");
        setLoading(false);
      });

    return () => { active = false; };
  }, []);

  if (loading) return <p className="rounded-2xl border border-[#dce4dd] bg-white p-6 text-sm text-[#64726b]">Loading weekly history...</p>;
  if (error) return <p className="rounded-2xl border border-red-200 bg-white p-6 text-sm font-bold text-red-700">{error}</p>;
  if (!plans.length) return <p className="rounded-2xl border border-[#dce4dd] bg-white p-6 text-sm text-[#64726b]">No previous weekly plans have been saved yet.</p>;

  return <section className="grid gap-4">
    {plans.map((plan) => <article className="rounded-2xl border border-[#dce4dd] bg-white p-6" key={plan.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Week of {plan.weekStart}</p>
          <h2 className="mt-2 font-serif text-2xl">{plan.weekLabel}</h2>
        </div>
        <p className="rounded-lg bg-[#f5f7f2] px-3 py-2 text-xs font-bold text-[#64726b]">Updated {new Date(plan.updatedAt).toLocaleDateString()}</p>
      </div>
      {plan.focus ? <p className="mt-4 text-sm font-bold text-[#16231e]">{plan.focus}</p> : null}
      {plan.mainBuild ? <p className="mt-2 text-sm text-[#64726b]">Main build: {plan.mainBuild}</p> : null}
      {plan.weeklyTargets?.length ? <div className="mt-5 grid gap-2">
        {plan.weeklyTargets.map((target) => <div className="flex items-start gap-2 rounded-lg bg-[#f5f7f2] px-3 py-2 text-sm" key={target.id}>
          <span className="mt-0.5 font-bold text-[#163c30]">{target.done ? "Done" : "Open"}</span>
          <span>{target.label || "Untitled target"}</span>
        </div>)}
      </div> : null}
      {plan.definitionOfDone?.length ? <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Definition of done</p>
        <ul className="mt-2 grid gap-1 text-sm text-[#293831]">
          {plan.definitionOfDone.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div> : null}
    </article>)}
  </section>;
}