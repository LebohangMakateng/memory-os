import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { ConfigErrorCard, DashboardShell, PageHeader } from "../_components/shell";
import { QuickNotesForm } from "./quick-notes-form";

type QuickNote = { id: string; title: string; notes: string; created_at: string };

async function loadQuickNotes() {
  await requireSession();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("quick_notes").select("id,title,notes,created_at").order("created_at", { ascending: false }).limit(20);
  return { notes: (data ?? []) as QuickNote[], error: error?.message ?? "" };
}

export default async function QuickNotesPage() {
  const { notes, error } = await loadQuickNotes();
  if (error) return <ConfigErrorCard message={error} />;

  return <DashboardShell active="Quick Notes">
    <PageHeader eyebrow="CAPTURE" title="Quick Notes">A lightweight inbox for links, ideas, reminders, and loose thoughts.</PageHeader>
    <QuickNotesTopMenu />
    <section className="mb-8 grid gap-5">
      <header className="border-b border-[#dce4dd]/70 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">CAPTURE + REVIEW</p>
        <h2 className="mt-1 font-serif text-2xl text-[#16231e]">Fast input first, recent notes second</h2>
      </header>
      <QuickNotesForm initialNotes={notes} />
    </section>
  </DashboardShell>;
}

function QuickNotesTopMenu() {
  const items = [
    { href: "#quick-note-capture", label: "Capture" },
    { href: "#quick-note-recent", label: "Recent" },
  ];

  return <nav className="sticky top-0 z-20 mb-8 py-3" aria-label="Quick note sections">
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => <a className="shrink-0 rounded-full border border-[#cad5cb]/70 bg-white/70 px-3 py-2 text-[11px] font-bold text-[#163c30] shadow-sm backdrop-blur-xl hover:border-[#163c30] md:rounded-lg md:text-xs" href={item.href} key={item.href}>{item.label}</a>)}
    </div>
  </nav>;
}
