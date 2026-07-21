"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WeeklyTaskManager, type WeeklyTaskManagerTask } from "./weekly-task-manager";

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
type Milestone = { id: string; projectId: string; title: string; outcome: string };
type Priority = { id: string; title: string; projectId: string | null; rank: number };
type Task = WeeklyTaskManagerTask;
type ChatMessage = { role: "user" | "assistant"; content: string };
type ProposedTask = {
  milestoneId: string;
  weeklyPriorityId?: string | null;
  title: string;
  description?: string | null;
  nextAction: string;
  reason: string;
  expectedOutcome: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  dueDate?: string | null;
  estimateMinutes: number;
  difficulty: number;
  energy: "low" | "medium" | "high";
  focusType: "revenue" | "learning" | "portfolio" | "maintenance";
  impact: { revenue: number; learning: number; portfolio: number; automation: number; enjoyment: number };
  shareStatus: "planned" | "drafting" | "ready_to_share" | "shared" | "not_applicable";
  shareChannel?: string | null;
  shareUrl?: string | null;
};
type AiDraft = Omit<WeeklyPlanPayload, "id" | "weekStart" | "weekLabel"> & { tasksToCreate: ProposedTask[]; notes?: string };

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

function isBlank(value: string | null | undefined) {
  return !value || !value.trim();
}

function blankStringArray(values: string[]) {
  return !values.length || values.every(isBlank);
}

function blankTargets(targets: Target[]) {
  return !targets.length || targets.every((target) => isBlank(target.label));
}

function blankOutreach(rows: OutreachRow[]) {
  return !rows.length || rows.every((row) => isBlank(row.name) && isBlank(row.platform) && isBlank(row.messageSent) && isBlank(row.response) && isBlank(row.followUp));
}

function mergeDay(current: DayPlan, draft?: DayPlan): DayPlan {
  if (!draft) return current;
  return {
    ...current,
    build: isBlank(current.build) ? draft.build : current.build,
    post: isBlank(current.post) ? draft.post : current.post,
    notes: isBlank(current.notes) ? draft.notes : current.notes,
    shipped: isBlank(current.shipped) ? draft.shipped : current.shipped,
    messages: isBlank(current.messages) ? draft.messages : current.messages,
    contacted: isBlank(current.contacted) ? draft.contacted : current.contacted,
    responses: isBlank(current.responses) ? draft.responses : current.responses,
    review: isBlank(current.review) ? draft.review : current.review,
  };
}

function mergeAiDraft(current: WeeklyPlanPayload, draft: AiDraft, weekStart: string): WeeklyPlanPayload {
  const draftDays = new Map(draft.dailyLog.map((day) => [day.day, day]));
  return {
    ...current,
    weekStart,
    weekLabel: formatWeekLabel(weekStart),
    focus: draft.focus,
    focusBullets: draft.focusBullets,
    mainBuild: draft.mainBuild,
    definitionOfDone: draft.definitionOfDone,
    weeklyTargets: blankTargets(current.weeklyTargets) ? draft.weeklyTargets : current.weeklyTargets,
    dailyLog: current.dailyLog.map((day) => mergeDay(day, draftDays.get(day.day))),
    outreachTracker: blankOutreach(current.outreachTracker) ? draft.outreachTracker : current.outreachTracker,
    rules: blankStringArray(current.rules) ? draft.rules : current.rules,
    fearCheck: {
      avoiding: isBlank(current.fearCheck.avoiding) ? draft.fearCheck.avoiding : current.fearCheck.avoiding,
      smallestAction: isBlank(current.fearCheck.smallestAction) ? draft.fearCheck.smallestAction : current.fearCheck.smallestAction,
    },
  };
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
function ChevronDownIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>;
}

function ChevronUpIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6" /></svg>;
}

function XIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}

function ArrowLeftIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>;
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

function dayLabel(day: string) {
  return day === "Friday" ? "Friday (Ship Day)" : day === "Saturday" ? "Saturday (Outreach)" : day;
}

function compactTasks(tasks: Task[]) {
  return tasks.map((task) => ({
    id: task.id,
    milestoneId: task.milestoneId,
    weeklyPriorityId: task.weeklyPriorityId,
    title: task.title,
    nextAction: task.nextAction,
    status: task.status,
  }));
}

export function WeeklyPlannerForm({ starterTargets, milestones, priorities, tasks }: { starterTargets: Target[]; milestones: Milestone[]; priorities: Priority[]; tasks: Task[] }) {
  const router = useRouter();
  const [currentWeekStart] = useState(() => getSundayWeekStart(new Date()));
  const [plan, setPlan] = useState<WeeklyPlanPayload>(() => createInitialPlan(starterTargets, currentWeekStart));
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [weeklyTargetsOpen, setWeeklyTargetsOpen] = useState(false);
  const [dailyLogOpen, setDailyLogOpen] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [openDays, setOpenDays] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiError, setAiError] = useState("");
  const [aiDraftText, setAiDraftText] = useState("");
  const [aiPending, startAiTransition] = useTransition();

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

  useEffect(() => {
    function toggleAi() {
      setAiOpen((open) => !open);
    }
    window.addEventListener("toggle-weekly-ai", toggleAi);
    return () => window.removeEventListener("toggle-weekly-ai", toggleAi);
  }, []);

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

  function toggleDay(dayName: string) {
    setOpenDays((current) => {
      const next = new Set(current);
      if (next.has(dayName)) next.delete(dayName);
      else next.add(dayName);
      return next;
    });
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

  function sendAiMessage() {
    const content = aiInput.trim();
    if (!content) return;
    const nextMessages: ChatMessage[] = [...aiMessages, { role: "user", content }];
    setAiInput("");
    setAiMessages(nextMessages);
    setAiError("");
    startAiTransition(async () => {
      try {
        const result = await parseJson(await fetch("/api/ai/weekly-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            currentPlan: { ...plan, weekStart: currentWeekStart, weekLabel: formatWeekLabel(currentWeekStart) },
            weekStart: currentWeekStart,
            weekLabel: formatWeekLabel(currentWeekStart),
            context: { milestones, priorities, tasks: compactTasks(tasks) },
          }),
        })) as { status: "needs_clarification"; message: string; questions: string[] } | { status: "ready"; message: string; draft: AiDraft };

        if (result.status === "needs_clarification") {
          setAiMessages([...nextMessages, { role: "assistant", content: `${result.message}\n\n${result.questions.map((question) => `- ${question}`).join("\n")}` }]);
          return;
        }

        setAiMessages([...nextMessages, { role: "assistant", content: result.message }]);
        setAiDraftText(JSON.stringify(result.draft, null, 2));
      } catch (caught) {
        setAiError(caught instanceof Error ? caught.message : "Could not create AI weekly plan.");
      }
    });
  }

  function approveAiDraft() {
    setAiError("");
    startAiTransition(async () => {
      try {
        const draft = JSON.parse(aiDraftText) as AiDraft;
        setPlan((current) => mergeAiDraft(current, draft, currentWeekStart));
        for (const task of draft.tasksToCreate ?? []) {
          await parseJson(await fetch("/api/execution/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(task) }));
        }
        setAiDraftText("");
        setSaveMessage(draft.tasksToCreate?.length ? "Applied AI draft and created weekly tasks. Review and save the weekly plan." : "Applied AI draft. Review and save the weekly plan.");
        router.refresh();
      } catch (caught) {
        setAiError(caught instanceof Error ? caught.message : "Could not apply AI draft.");
      }
    });
  }

  const aiPanel = <aside className="grid h-fit gap-4 rounded-2xl border border-[#dce4dd] bg-white p-5 xl:sticky xl:top-8">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">AI weekly planner</p>
        <h2 className="mt-2 font-serif text-2xl">Describe this week</h2>
      </div>
      <button aria-label="Hide AI planner" className="grid size-9 place-items-center rounded-lg border border-[#cad5cb] text-[#163c30]" onClick={() => setAiOpen(false)} title="Hide AI planner" type="button"><XIcon /></button>
    </div>

    <div className="grid max-h-[34rem] gap-3 overflow-auto rounded-xl bg-[#f5f7f2] p-4">
      {aiMessages.length ? aiMessages.map((message, index) => <div className={message.role === "user" ? "ml-auto max-w-[90%] rounded-lg bg-[#163c30] px-3 py-2 text-sm text-white" : "mr-auto max-w-[90%] whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-sm text-[#293831]"} key={`${message.role}-${index}`}>{message.content}</div>) : <p className="text-sm text-[#64726b]">Tell the assistant what you want to work on, your constraints, deadlines, energy, and what should be shipped or shared.</p>}
    </div>

    {!aiDraftText ? <div className="grid gap-3">
      <textarea className="min-h-36 rounded-lg border border-[#dce4dd] px-3 py-2 text-sm leading-6 outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]" onChange={(event) => setAiInput(event.target.value)} placeholder="Example: This week I want to focus on shipping the sneaker inventory MVP, publish two posts, and do outreach without overloading myself..." value={aiInput} />
      <button className="rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={aiPending || !aiInput.trim()} onClick={sendAiMessage} type="button">{aiPending ? "Thinking..." : "Send"}</button>
    </div> : <div className="grid gap-3">
      <label className="grid gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Editable draft JSON</span>
        <textarea className="min-h-96 rounded-lg border border-[#dce4dd] bg-[#f5f7f2] px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]" onChange={(event) => setAiDraftText(event.target.value)} value={aiDraftText} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={aiPending} onClick={approveAiDraft} type="button">{aiPending ? "Applying..." : "Approve and apply"}</button>
        <button aria-label="Back to chat" className="grid size-11 place-items-center rounded-lg border border-[#cad5cb] text-[#163c30]" onClick={() => setAiDraftText("")} title="Back to chat" type="button"><ArrowLeftIcon /></button>
      </div>
    </div>}
    {aiError ? <p className="text-sm font-bold text-red-700">{aiError}</p> : null}
  </aside>;

  return <section className={aiOpen ? "grid gap-6 xl:grid-cols-[minmax(530px,1fr)_minmax(530px,1fr)]" : "grid gap-6"}>
    {aiOpen ? aiPanel : null}
    <div className="grid gap-6">
        {dashboardOpen ? <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Weekly dashboard</p>
              <h2 className="mt-2 font-serif text-2xl">Execution OS</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={pending} onClick={savePlan} type="button">{pending ? "Saving..." : "Save weekly plan"}</button>
              <button aria-label="Hide weekly dashboard" className="grid size-11 place-items-center rounded-lg border border-[#cad5cb] text-[#163c30]" onClick={() => setDashboardOpen(false)} title="Hide weekly dashboard" type="button"><ChevronUpIcon /></button>
            </div>
          </div>
          {saveMessage ? <p className="mt-3 text-sm font-bold text-[#3d6729]">{saveMessage}</p> : null}
          {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}
          <div className="mt-5 grid gap-4">
            <Field label="Week" readOnly value={plan.weekLabel} />
          </div>
          <div className="mt-4 grid gap-4">
            <MultiField label="Focus bullets" onChange={(value) => updatePlan({ focusBullets: textToLines(value) })} rows={3} value={linesToText(plan.focusBullets)} />
            <Field label="Main build" onChange={(mainBuild) => updatePlan({ mainBuild })} value={plan.mainBuild} />
            <MultiField label="Definition of done by Friday" onChange={(value) => updatePlan({ definitionOfDone: textToLines(value) })} rows={5} value={linesToText(plan.definitionOfDone)} />
          </div>
        </article> : <button className="flex items-center justify-between gap-4 rounded-2xl border border-[#dce4dd] bg-white p-6 text-left" onClick={() => setDashboardOpen(true)} type="button">
          <span><span className="block text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Weekly dashboard</span><span className="mt-2 block font-serif text-2xl text-[#16231e]">Execution OS</span></span>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#163c30] text-white"><ChevronDownIcon /></span>
        </button>}

        <WeeklyTaskManager milestones={milestones} priorities={priorities} tasks={tasks} />

        {weeklyTargetsOpen ? <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">Weekly targets</h2>
            <div className="flex gap-2"><button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30]" onClick={() => updatePlan({ weeklyTargets: [...plan.weeklyTargets, { id: nextId(), label: "", done: false }] })} type="button">Add target</button><button aria-label="Hide weekly targets" className="grid size-9 place-items-center rounded-lg border border-[#cad5cb] text-[#163c30]" onClick={() => setWeeklyTargetsOpen(false)} title="Hide weekly targets" type="button"><ChevronUpIcon /></button></div>
          </div>
          <div className="grid gap-3">
            {plan.weeklyTargets.map((target) => <div className="grid gap-3 rounded-lg bg-[#f5f7f2] p-3 md:grid-cols-[auto_1fr]" key={target.id}>
              <input checked={target.done} className="mt-3 size-4 accent-[#163c30]" onChange={(event) => updateTarget(target.id, { done: event.target.checked })} type="checkbox" />
              <input className="h-10 rounded-lg border border-[#dce4dd] bg-white px-3 text-sm outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]" onChange={(event) => updateTarget(target.id, { label: event.target.value })} value={target.label} />
            </div>)}
          </div>
        </article> : <button className="flex items-center justify-between rounded-2xl border border-[#dce4dd] bg-white p-6 text-left" onClick={() => setWeeklyTargetsOpen(true)} type="button">
          <span className="font-serif text-2xl text-[#16231e]">Weekly targets</span>
          <span className="grid size-10 place-items-center rounded-lg bg-[#163c30] text-white"><ChevronDownIcon /></span>
        </button>}

        {dailyLogOpen ? <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">EXECUTION</p><h2 className="mt-2 font-serif text-2xl">Daily execution log</h2></div><button aria-label="Hide daily execution log" className="grid size-9 place-items-center rounded-lg border border-[#cad5cb] text-[#163c30]" onClick={() => setDailyLogOpen(false)} title="Hide daily execution log" type="button"><ChevronUpIcon /></button></div>
          <div className="mt-5 grid gap-4">
            {plan.dailyLog.map((day) => {
              const dayOpen = openDays.has(day.day);
              return <section className="rounded-xl border border-[#dce4dd] bg-[#f5f7f2] p-4" key={day.day}>
                <button className="flex w-full items-center justify-between text-left" onClick={() => toggleDay(day.day)} type="button">
                  <span className="font-bold">{dayLabel(day.day)}</span>
                  <span className="grid size-8 place-items-center rounded-lg border border-[#cad5cb] bg-white text-[#163c30]">{dayOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}</span>
                </button>
                {dayOpen ? day.day === "Saturday" ? <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <Field label="Messages sent" onChange={(messages) => updateDay(day.day, { messages })} value={day.messages} />
                  <Field label="Who contacted" onChange={(contacted) => updateDay(day.day, { contacted })} value={day.contacted} />
                  <Field label="Responses" onChange={(responses) => updateDay(day.day, { responses })} value={day.responses} />
                </div> : <div className="mt-3 grid gap-3">
                  <MultiField label={day.day === "Friday" ? "What did you ship? Link / Demo" : "Build"} onChange={(value) => updateDay(day.day, day.day === "Friday" ? { shipped: value } : { build: value })} rows={2} value={day.day === "Friday" ? day.shipped : day.build} />
                  <MultiField label="Post" onChange={(post) => updateDay(day.day, { post })} rows={2} value={day.post} />
                  <MultiField label="Notes" onChange={(notes) => updateDay(day.day, { notes })} rows={2} value={day.notes} />
                </div> : null}
              </section>;
            })}
          </div>
        </article> : <button className="flex items-center justify-between rounded-2xl border border-[#dce4dd] bg-white p-6 text-left" onClick={() => setDailyLogOpen(true)} type="button">
          <span><span className="block text-[10px] font-bold tracking-[.14em] text-[#64726b]">EXECUTION</span><span className="mt-2 block font-serif text-2xl text-[#16231e]">Daily execution log</span></span>
          <span className="grid size-10 place-items-center rounded-lg bg-[#163c30] text-white"><ChevronDownIcon /></span>
        </button>}

        {outreachOpen ? <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">Outreach tracker</h2>
            <div className="flex gap-2"><button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30]" onClick={() => updatePlan({ outreachTracker: [...plan.outreachTracker, { id: plan.outreachTracker.length + 1, name: "", platform: "", messageSent: "", response: "", followUp: "" }] })} type="button">Add row</button><button aria-label="Hide outreach tracker" className="grid size-9 place-items-center rounded-lg border border-[#cad5cb] text-[#163c30]" onClick={() => setOutreachOpen(false)} title="Hide outreach tracker" type="button"><ChevronUpIcon /></button></div>
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
        </article> : <button className="flex items-center justify-between rounded-2xl border border-[#dce4dd] bg-white p-6 text-left" onClick={() => setOutreachOpen(true)} type="button">
          <span className="font-serif text-2xl text-[#16231e]">Outreach tracker</span>
          <span className="grid size-10 place-items-center rounded-lg bg-[#163c30] text-white"><ChevronDownIcon /></span>
        </button>}

        {rulesOpen ? <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="font-serif text-2xl">Rules and fear check</h2><button aria-label="Hide rules and fear check" className="grid size-9 place-items-center rounded-lg border border-[#cad5cb] text-[#163c30]" onClick={() => setRulesOpen(false)} title="Hide rules and fear check" type="button"><ChevronUpIcon /></button></div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
            <MultiField label="Rules" onChange={(value) => updatePlan({ rules: textToLines(value) })} rows={4} value={linesToText(plan.rules)} />
            <div className="grid gap-3">
              <MultiField label="What am I avoiding?" onChange={(avoiding) => updatePlan({ fearCheck: { ...plan.fearCheck, avoiding } })} rows={2} value={plan.fearCheck.avoiding} />
              <MultiField label="Smallest action I can take right now" onChange={(smallestAction) => updatePlan({ fearCheck: { ...plan.fearCheck, smallestAction } })} rows={2} value={plan.fearCheck.smallestAction} />
            </div>
          </div>
        </article> : <button className="flex items-center justify-between rounded-2xl border border-[#dce4dd] bg-white p-6 text-left" onClick={() => setRulesOpen(true)} type="button">
          <span className="font-serif text-2xl text-[#16231e]">Rules and fear check</span>
          <span className="grid size-10 place-items-center rounded-lg bg-[#163c30] text-white"><ChevronDownIcon /></span>
        </button>}
      </div>
  </section>;
}