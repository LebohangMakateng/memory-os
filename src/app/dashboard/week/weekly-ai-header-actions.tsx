"use client";

function ClockIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}

function SparklesIcon() {
  return <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" /><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" /></svg>;
}

export function WeeklyAiHeaderActions() {
  return <div className="flex flex-wrap gap-2">
    <a aria-label="Weekly history" className="grid size-11 place-items-center rounded-lg border border-[#cad5cb] bg-white text-[#163c30]" href="/dashboard/week/history" title="Weekly history"><ClockIcon /></a>
    <button aria-label="AI weekly planner" className="grid size-11 place-items-center rounded-lg bg-[#163c30] text-white" onClick={() => window.dispatchEvent(new Event("toggle-weekly-ai"))} title="AI weekly planner" type="button"><SparklesIcon /></button>
  </div>;
}