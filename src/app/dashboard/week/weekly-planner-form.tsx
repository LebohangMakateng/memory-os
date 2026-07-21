"use client";

import { useEffect, useState, useTransition } from "react";

type Target = { id: string; label: string; done: boolean };
type DayPlan = { day: string; build: string; post: string; notes: string; shipped: string; messages: string; contacted: string; responses: string; review: string };
type OutreachRow = { id: number; name: string; platform: string; messageSent: string; response: string; followUp: string };
type FearCheck = { avoiding: string; smallestAction: string };
type WeeklyPlanPayload = {
  id?: string;
  weekStart: string;
  weekLabel: string;
  focus: string;
  focusBullets: string[];
  mainBuild: string;
  definitionOfDone: string[];
  weeklyTargets: Target[];
  dailyLog: DayPlan[];
  outreachTracker: OutreachRow[];
  rules: string[];
  fearCheck: FearCheck;
};

const defaultRules = ["No new ideas mid-week", "Ship before perfect", "If you build you post", "No zero days"];
const defaultDays: DayPlan[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => ({
  day,
  build: "",
  post: "",
  notes: "",
  shipped: "",
  messages: "",
  contacted: "",
  responses: "",
  review: "",
}));

function nextId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
}

function linesToText(lines: string[]) {
  return lines.join("\n");
}

function textToLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

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

function formatWeekLabel(weekStart: string) {
  const [year, month, day] = weekStart.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function Field({ label, value, onChange, placeholder, readOnly = false }: { label: string; value: string; onChange?: (value: string) => void; placeholder?: string; readOnly?: boolean }) {
  return <label className="grid gap-2">
    <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">{label}</span>
    <input className="h-11 rounded-lg border border-[#dce4dd] bg-white px-3 text-sm outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61] read-only:bg-[#f5f7f2]" onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} readOnly={readOnly} value={value} />
  </label>;
}

function MultiField({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return <label className="grid gap-2">
    <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">{label}</span>
    <textarea className="min-h-24 w-full rounded-lg border border-[#dce4dd] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} value={value} />
  </label>;
}

function createInitialPlan(starterTargets: Target[], weekStart: string): WeeklyPlanPayload {
  return {
    weekStart,
    weekLabel: formatWeekLabel(weekStart),
    focus: "",
    focusBullets: [],
    mainBuild: "",
    definitionOfDone: [],
    weeklyTargets: starterTargets.length ? starterTargets : [
      { id: "ship", label: "", done: false },
      { id: "posts", label: "", done: false },
      { id: "outreach", label: "", done: false },
    ],
    dailyLog: defaultDays,
    outreachTracker: [
      { id: 1, name: "", platform: "", messageSent: "", response: "", followUp: "" },
      { id: 2, name: "", platform: "", messageSent: "", response: "", followUp: "" },
      { id: 3, name: "", platform: "", messageSent: "", response: "", followUp: "" },
    ],
    rules: defaultRules,
    fearCheck: { avoiding: "", smallestAction: "" },
  };
}

async function parseJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body && typeof body === "object" && "error" in body ? body.error : null;
    throw new Error(typeof error === "string" ? error : "Request failed.");
  }
  return body;
}

export function WeeklyPlannerForm({ starterTargets }: { starterTargets: Target[] }) {
  const [currentWeekStart] = useState(() => getSundayWeekStart(new Date()));
  const [plan, setPlan] = useState<WeeklyPlanPayload>(() => createInitialPlan(starterTargets, currentWeekStart));
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    fetch(`/api/execution/weekly-plan?weekStart=${currentWeekStart}`)
      .then(parseJson)
      .then((savedPlan: WeeklyPlanPayload | null) => {
        if (!active) return;
        setPlan(savedPlan ?? createInitialPlan(starterTargets, currentWeekStart));
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load weekly plan.");
      });
    return () => { active = false; };
  }, [currentWeekStart, starterTargets]);

  function updatePlan(patch: Partial<WeeklyPlanPayload>) {
    setPlan((current) => ({ ...current, ...patch, weekStart: currentWeekStart, weekLabel: formatWeekLabel(currentWeekStart) }));
  }

  function updateTarget(id: string, patch: Partial<Target>) {
    updatePlan({ weeklyTargets: plan.weeklyTargets.map((target) => target.id === id ? { ...target, ...patch } : target) });
  }

  function updateDay(dayName: string, patch: Partial<DayPlan>) {
    updatePlan({ dailyLog: plan.dailyLog.map((day) => day.day === dayName ? { ...day, ...patch } : day) });
  }

  function updateOutreach(id: number, patch: Partial<OutreachRow>) {
    updatePlan({ outreachTracker: plan.outreachTracker.map((row) => row.id === id ? { ...row, ...patch } : row) });
  }

  function savePlan() {
    setError("");
    setSaveMessage("");
    startTransition(async () => {
      try {
        const savedPlan = await parseJson(await fetch("/api/execution/weekly-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...plan, weekStart: currentWeekStart, weekLabel: formatWeekLabel(currentWeekStart) }),
        })) as WeeklyPlanPayload;
        setPlan(savedPlan);
        setSaveMessage("Saved weekly plan.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save weekly plan.");
      }
    });
  }

  return <section className="grid gap-6">
    <div className="grid gap-6">
      <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Weekly dashboard</p>
            <h2 className="mt-2 font-serif text-2xl">Execution OS</h2>
          </div>
          <button className="rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={pending} onClick={savePlan} type="button">{pending ? "Saving..." : "Save weekly plan"}</button>
        </div>
        {saveMessage ? <p className="mt-3 text-sm font-bold text-[#3d6729]">{saveMessage}</p> : null}
        {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Week" readOnly value={plan.weekLabel} />
          <Field label="Focus" onChange={(focus) => updatePlan({ focus })} value={plan.focus} />
        </div>
        <div className="mt-4 grid gap-4">
          <MultiField label="Focus bullets" onChange={(value) => updatePlan({ focusBullets: textToLines(value) })} rows={3} value={linesToText(plan.focusBullets)} />
          <Field label="Main build" onChange={(mainBuild) => updatePlan({ mainBuild })} value={plan.mainBuild} />
          <MultiField label="Definition of done by Friday" onChange={(value) => updatePlan({ definitionOfDone: textToLines(value) })} rows={5} value={linesToText(plan.definitionOfDone)} />
        </div>
      </article>

      <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Weekly targets</h2>
          <button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30]" onClick={() => updatePlan({ weeklyTargets: [...plan.weeklyTargets, { id: nextId(), label: "", done: false }] })} type="button">Add target</button>
        </div>
        <div className="grid gap-3">
          {plan.weeklyTargets.map((target) => <div className="grid gap-3 rounded-lg bg-[#f5f7f2] p-3 md:grid-cols-[auto_1fr]" key={target.id}>
            <input checked={target.done} className="mt-3 size-4 accent-[#163c30]" onChange={(event) => updateTarget(target.id, { done: event.target.checked })} type="checkbox" />
            <input className="h-10 rounded-lg border border-[#dce4dd] bg-white px-3 text-sm outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]" onChange={(event) => updateTarget(target.id, { label: event.target.value })} value={target.label} />
          </div>)}
        </div>
      </article>

      <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
        <h2 className="font-serif text-2xl">Daily execution log</h2>
        <div className="mt-5 grid gap-4">
          {plan.dailyLog.map((day) => <section className="rounded-xl border border-[#dce4dd] bg-[#f5f7f2] p-4" key={day.day}>
            <h3 className="font-bold">{day.day === "Friday" ? "Friday (Ship Day)" : day.day === "Saturday" ? "Saturday (Outreach)" : day.day}</h3>
            {day.day === "Saturday" ? <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label="Messages sent" onChange={(messages) => updateDay(day.day, { messages })} value={day.messages} />
              <Field label="Who contacted" onChange={(contacted) => updateDay(day.day, { contacted })} value={day.contacted} />
              <Field label="Responses" onChange={(responses) => updateDay(day.day, { responses })} value={day.responses} />
            </div> : <div className="mt-3 grid gap-3">
              <MultiField label={day.day === "Friday" ? "What did you ship? Link / Demo" : "Build"} onChange={(value) => updateDay(day.day, day.day === "Friday" ? { shipped: value } : { build: value })} rows={2} value={day.day === "Friday" ? day.shipped : day.build} />
              <MultiField label="Post" onChange={(post) => updateDay(day.day, { post })} rows={2} value={day.post} />
              <MultiField label="Notes" onChange={(notes) => updateDay(day.day, { notes })} rows={2} value={day.notes} />
            </div>}
          </section>)}
        </div>
      </article>

      <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Outreach tracker</h2>
          <button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30]" onClick={() => updatePlan({ outreachTracker: [...plan.outreachTracker, { id: plan.outreachTracker.length + 1, name: "", platform: "", messageSent: "", response: "", followUp: "" }] })} type="button">Add row</button>
        </div>
        <div className="grid gap-3">
          {plan.outreachTracker.map((row) => <div className="grid gap-2 rounded-lg bg-[#f5f7f2] p-3 md:grid-cols-5" key={row.id}>
            <input aria-label="Name" className="h-10 rounded-lg border border-[#dce4dd] px-3 text-sm" onChange={(event) => updateOutreach(row.id, { name: event.target.value })} placeholder="Name" value={row.name} />
            <input aria-label="Platform" className="h-10 rounded-lg border border-[#dce4dd] px-3 text-sm" onChange={(event) => updateOutreach(row.id, { platform: event.target.value })} placeholder="Platform" value={row.platform} />
            <input aria-label="Message sent" className="h-10 rounded-lg border border-[#dce4dd] px-3 text-sm" onChange={(event) => updateOutreach(row.id, { messageSent: event.target.value })} placeholder="Message sent" value={row.messageSent} />
            <input aria-label="Response" className="h-10 rounded-lg border border-[#dce4dd] px-3 text-sm" onChange={(event) => updateOutreach(row.id, { response: event.target.value })} placeholder="Response" value={row.response} />
            <input aria-label="Follow-up" className="h-10 rounded-lg border border-[#dce4dd] px-3 text-sm" onChange={(event) => updateOutreach(row.id, { followUp: event.target.value })} placeholder="Follow-up" value={row.followUp} />
          </div>)}
        </div>
      </article>

      <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
        <h2 className="font-serif text-2xl">Rules and fear check</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          <MultiField label="Rules" onChange={(value) => updatePlan({ rules: textToLines(value) })} rows={4} value={linesToText(plan.rules)} />
          <div className="grid gap-3">
            <MultiField label="What am I avoiding?" onChange={(avoiding) => updatePlan({ fearCheck: { ...plan.fearCheck, avoiding } })} rows={2} value={plan.fearCheck.avoiding} />
            <MultiField label="Smallest action I can take right now" onChange={(smallestAction) => updatePlan({ fearCheck: { ...plan.fearCheck, smallestAction } })} rows={2} value={plan.fearCheck.smallestAction} />
          </div>
        </div>
      </article>
    </div>
  </section>;
}