"use client";

import { FormEvent, useState, useTransition } from "react";

type QuickNote = { id: string; title: string; notes: string; created_at: string };

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

export function QuickNotesForm({ initialNotes }: { initialNotes: QuickNote[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

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
    <article className="rounded-2xl border border-[#dce4dd] bg-white p-6 md:p-7">
      <h2 className="font-serif text-2xl text-[#16231e]">New note</h2>
      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-xs font-bold text-[#32443a]">Title
          <input className="rounded-lg border border-[#cad5cb] bg-white px-3 py-3 text-sm outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]" name="title" required />
        </label>
        <label className="grid gap-1 text-xs font-bold text-[#32443a]">Notes
          <textarea className="min-h-56 rounded-lg border border-[#cad5cb] bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]" name="notes" required />
        </label>
        <button className="rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Saving..." : "Save"}</button>
        {saved ? <p className="text-sm font-bold text-[#163c30]">{saved}</p> : null}
        {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
      </form>
    </article>

    <article className="rounded-2xl border border-[#dce4dd] bg-white p-6 md:p-7">
      <h2 className="font-serif text-2xl text-[#16231e]">Recent captures</h2>
      <div className="mt-5 grid gap-3">
        {notes.length ? notes.map((note) => <section className="rounded-xl bg-[#f5f7f2] p-4" key={note.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-sm font-bold text-[#16231e]">{note.title}</h3>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">{formatCreatedAt(note.created_at)}</p>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#64726b]">{note.notes}</p>
        </section>) : <p className="rounded-xl bg-[#f5f7f2] p-4 text-sm text-[#64726b]">No quick notes yet.</p>}
      </div>
    </article>
  </section>;
}
