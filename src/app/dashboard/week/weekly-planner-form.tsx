"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type Target = { id: string; label: string; done: boolean };
type DayPlan = { day: string; build: string; post: string; notes: string; shipped: string; messages: string; contacted: string; responses: string; review: string };
type OutreachRow = { id: number; name: string; platform: string; messageSent: string; response: string; followUp: string };
type FearCheck = { avoiding: string; smallestAction: string };
type WeeklyPlanPayload = {
  id?: string;
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
const defaultDays: DayPlan[] = [
  { day: "Tuesday", build: "SneakerInventory, integrate Cursor SDK into LeboAI.", post: "First LeboAI article? maybe on Wednesday.", notes: "", shipped: "", messages: "", contacted: "", responses: "", review: "" },
  { day: "Wednesday", build: "SneakerInventory, integrate Cursor SDK into LeboAI.", post: "First LeboAI article, definitely in the morning.", notes: "", shipped: "", messages: "", contacted: "", responses: "", review: "" },
  { day: "Thursday", build: "SneakerInventory, integrate Cursor SDK into LeboAI.", post: "", notes: "Finalize list of people to contact.", shipped: "", messages: "", contacted: "", responses: "", review: "" },
  { day: "Friday", build: "", post: "Second LeboAI article, definitely in the morning.", notes: "", shipped: "Link / Demo:", messages: "", contacted: "", responses: "", review: "" },
  { day: "Saturday", build: "", post: "", notes: "", shipped: "", messages: "", contacted: "", responses: "", review: "" },
  { day: "Sunday", build: "", post: "", notes: "", shipped: "", messages: "", contacted: "", responses: "", review: "" },
];

function nextId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
}

function linesToText(lines: string[]) {
  return lines.join("\n");
}

function textToLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="grid gap-2">
    <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">{label}</span>
    <input className="h-11 rounded-lg border border-[#dce4dd] bg-white px-3 text-sm outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
  </label>;
}

function MultiField({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return <label className="grid gap-2">
    <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">{label}</span>
    <textarea className="min-h-24 w-full rounded-lg border border-[#dce4dd] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} value={value} />
  </label>;
}

function createInitialPlan(starterTargets: Target[]): WeeklyPlanPayload {
  return {
    weekLabel: "May 4, 2026",
    focus: "What are you building this week?",
    focusBullets: ["Have a look at Cursor SDK", "Sneaker Inventory or trade platform"],
    mainBuild: "Sneaker Inventory or trade platform",
    definitionOfDone: [
      "Integrate into LeboAI.",
      "Write article: Cursor released an SDK and I just had to try it out.",
      "Dev and implement. Vibe code.",
      "Release and market. Create IG and TikTok account.",
    ],
    weeklyTargets: starterTargets.length ? starterTargets : [
      { id: "ship", label: "Ship 2 artifacts = LeboAI articles, Cursor integration, SneakerInventory.", done: false },
      { id: "posts", label: "35 posts = story about Sneaker Inventory.", done: false },
      { id: "outreach", label: "1020 outreach messages to people I know and random TikTok prospects.", done: false },
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
  const [plan, setPlan] = useState<WeeklyPlanPayload>(() => createInitialPlan(starterTargets));
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    fetch("/api/execution/weekly-plan")
      .then(parseJson)
      .then((savedPlan: WeeklyPlanPayload | null) => {
        if (active && savedPlan) setPlan(savedPlan);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load weekly plan.");
      });
    return () => { active = false; };
  }, []);

  const markdown = useMemo(() => {
    const targetLines = plan.weeklyTargets.map((target) => `- [${target.done ? "x" : " "}] ${target.label}`).join("\n");
    const dayLines = plan.dailyLog.map((day) => {
      if (day.day === "Friday") return `Friday (Ship Day)\nWhat did you ship? ${day.shipped}\nPost: ${day.post}\nNotes: ${day.notes}`;
      if (day.day === "Saturday") return `Saturday (Outreach)\nMessages sent: ${day.messages}\nWho you contacted: ${day.contacted}\nResponses: ${day.responses}`;
      if (day.day === "Sunday") return `Sunday (Review)\nWhat did you ship? ${day.shipped}\nOutreach count: ${day.messages}\nWhat worked / didn't / adjustment: ${day.review}`;
      return `${day.day}\nBuild: ${day.build}\nPost: ${day.post}\nNotes: ${day.notes}`;
    }).join("\n\n---\n\n");
    const rows = plan.outreachTracker.map((row) => `| ${row.name} | ${row.platform} | ${row.messageSent} | ${row.response} | ${row.followUp} |`).join("\n");

    return `# Execution OS\n\n## Weekly Dashboard\n\nWeek: ${plan.weekLabel}\n\nFocus: ${plan.focus}\n\n${plan.focusBullets.map((item) => `- ${item}`).join("\n")}\n\nDefinition of Done (by Friday):\n\n${plan.definitionOfDone.map((item) => `- ${item}`).join("\n")}\n\n### Weekly Targets\n\n${targetLines}\n\n## Daily Execution Log\n\n${dayLines}\n\n## Outreach Tracker\n\n| Name | Platform | Message Sent | Response | Follow-up |\n| --- | --- | --- | --- | --- |\n${rows}\n\n${plan.rules.map((rule) => `- ${rule}`).join("\n")}\n\n## Fear Check\n\nWhat am I avoiding?\n${plan.fearCheck.avoiding}\n\nSmallest action I can take right now:\n${plan.fearCheck.smallestAction}`;
  }, [plan]);

  function updatePlan(patch: Partial<WeeklyPlanPayload>) {
    setPlan((current) => ({ ...current, ...patch }));
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
          body: JSON.stringify(plan),
        })) as WeeklyPlanPayload;
        setPlan(savedPlan);
        setSaveMessage("Saved weekly plan.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save weekly plan.");
      }
    });
  }

  return <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
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
          <Field label="Week" onChange={(weekLabel) => updatePlan({ weekLabel })} value={plan.weekLabel} />
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
            <h3 className="font-bold">{day.day === "Friday" ? "Friday (Ship Day)" : day.day === "Saturday" ? "Saturday (Outreach)" : day.day === "Sunday" ? "Sunday (Review)" : day.day}</h3>
            {day.day === "Saturday" ? <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label="Messages sent" onChange={(messages) => updateDay(day.day, { messages })} value={day.messages} />
              <Field label="Who contacted" onChange={(contacted) => updateDay(day.day, { contacted })} value={day.contacted} />
              <Field label="Responses" onChange={(responses) => updateDay(day.day, { responses })} value={day.responses} />
            </div> : day.day === "Sunday" ? <div className="mt-3 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="What shipped" onChange={(shipped) => updateDay(day.day, { shipped })} value={day.shipped} />
                <Field label="Outreach count" onChange={(messages) => updateDay(day.day, { messages })} value={day.messages} />
              </div>
              <MultiField label="What worked, what did not, adjustment" onChange={(review) => updateDay(day.day, { review })} value={day.review} />
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

    <aside className="h-fit rounded-2xl border border-[#dce4dd] bg-white p-6 xl:sticky xl:top-8">
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Markdown preview</p>
      <h2 className="mt-2 font-serif text-2xl">Execution OS</h2>
      <pre className="mt-5 max-h-[calc(100vh-12rem)] overflow-auto whitespace-pre-wrap rounded-xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#293831]">{markdown}</pre>
    </aside>
  </section>;
}
