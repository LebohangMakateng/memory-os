"use client";

export function WeeklyAiHeaderActions() {
  return <div className="flex flex-wrap gap-2">
    <a className="rounded-lg border border-[#cad5cb] bg-white px-4 py-3 text-sm font-bold text-[#163c30]" href="/dashboard/week/history">View history</a>
    <button className="rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white" onClick={() => window.dispatchEvent(new Event("toggle-weekly-ai"))} type="button">AI</button>
  </div>;
}