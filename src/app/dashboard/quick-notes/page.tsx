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
    <QuickNotesForm initialNotes={notes} />
  </DashboardShell>;
}
