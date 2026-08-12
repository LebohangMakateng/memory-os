"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";

type QuickNote = { id: string; title: string; notes: string; created_at: string };

const inputClass = "rounded-lg border border-[#cad5cb]/70 bg-white/70 px-3 py-3 text-sm outline-none backdrop-blur-xl focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]";
const labelClass = "grid gap-1 text-xs font-bold text-[#32443a]";
const primaryButton = "rounded-lg bg-[#163c30]/85 px-4 py-3 text-sm font-bold text-white backdrop-blur-xl disabled:opacity-60";

async function parseJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body && typeof body === "object" && "error" in body ? body.error : null;
    throw new Error(typeof error === "string" ? error : "Request failed.");
  }
  return body;
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function firstLine(value: string) {
  return value.split("\\n").find(Boolean)?.trim() ?? "No details";
}

export function QuickNotesForm({ initialNotes }: { initialNotes: QuickNote[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const latest = notes[0];
  const noteCountLabel = useMemo(() => notes.length === 1 ? "1 capture" : notes.length + " captures", [notes.length]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = data.get("title")?.toString().trim();
    const noteText = data.get("notes")?.toString().trim();
    if (!title || !noteText) return;

    setError("");
    setSaved("");
    startTransition(async () => {
      try {
        const created = await parseJson(await fetch("/api/execution/quick-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, notes: noteText }),
        })) as QuickNote;
        setNotes((current) => [created, ...current].slice(0, 20));
        setSaved("Saved.");
        form.reset();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not save quick note.");
      }
    });
  }

  return <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3" id="quick-note-summary">
        <Metric label="Inbox" value={noteCountLabel} />
        <Metric label="Latest" value={latest ? formatCreatedAt(latest.created_at) : "Empty"} compact />
      </div>

      <article className="scroll-mt-28 rounded-2xl border border-[#dce4dd]/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl md:p-7" id="quick-note-capture">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Capture</p>
            <h2 className="mt-2 font-serif text-2xl text-[#16231e]">New note</h2>
          </div>
          <span className="rounded-full bg-white/45 px-3 py-2 text-[11px] font-bold text-[#163c30] backdrop-blur-xl">Quick inbox</span>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <label className={labelClass}>Title
            <input className={inputClass} name="title" placeholder="What is this?" required />
          </label>
          <label className={labelClass}>Notes
            <textarea className={inputClass + " min-h-36 leading-6 md:min-h-56"} name="notes" placeholder="Paste a link, jot an idea, or capture the next action." required />
          </label>
          <button className={primaryButton} disabled={pending} type="submit">{pending ? "Saving..." : "Save note"}</button>
          {saved ? <p className="text-sm font-bold text-[#163c30]">{saved}</p> : null}
          {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
        </form>
      </article>
    </div>

    <article className="scroll-mt-28 rounded-2xl border border-[#dce4dd]/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl md:p-7" id="quick-note-recent">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Review</p>
          <h2 className="mt-2 font-serif text-2xl text-[#16231e]">Recent captures</h2>
        </div>
        <span className="rounded-full bg-white/45 px-3 py-2 text-[11px] font-bold text-[#163c30] backdrop-blur-xl">Last 20</span>
      </div>

      <div className="mt-5 grid gap-3">
        {notes.length ? notes.map((note) => <section className="rounded-xl border border-[#dce4dd]/60 bg-white/35 p-4 backdrop-blur-xl" key={note.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-[#16231e]">{note.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64726b] md:hidden">{firstLine(note.notes)}</p>
            </div>
            <p className="shrink-0 text-right text-[10px] font-bold uppercase tracking-[.12em] text-[#64726b]">{formatCreatedAt(note.created_at)}</p>
          </div>
          <p className="mt-3 hidden max-h-32 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[#64726b] md:block">{note.notes}</p>
          <details className="mt-3 md:hidden">
            <summary className="cursor-pointer text-xs font-bold text-[#163c30]">Open note</summary>
            <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[#64726b]">{note.notes}</p>
          </details>
        </section>) : <p className="rounded-xl bg-white/35 p-4 text-sm text-[#64726b] backdrop-blur-xl">No quick notes yet.</p>}
      </div>
    </article>
  </section>;
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <article className="rounded-2xl border border-[#dce4dd]/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">{label}</p>
    <p className={compact ? "mt-2 text-xs font-black leading-5 text-[#16231e]" : "mt-2 text-xl font-black text-[#16231e]"}>{value}</p>
  </article>;
}
