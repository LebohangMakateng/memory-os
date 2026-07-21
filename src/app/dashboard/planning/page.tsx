import { ApproveDraftButton, PlannerForm } from "../dashboard-actions";
import { ConfigErrorCard, DashboardShell, EmptyWorkspaceCard, PageHeader } from "../_components/shell";
import { loadOverview } from "../_components/data";

export default async function PlanningPage() {
  const { overview, error } = await loadOverview();
  if (error) return <ConfigErrorCard message={error} />;
  if (!overview?.vision) return <EmptyWorkspaceCard />;
  const activeProject = overview.projects[0];

  return <DashboardShell active="AI planning">
    <PageHeader eyebrow="AI PLANNING" title="Plan with Claude">Draft milestones and tasks, then approve only what should become real work.</PageHeader>
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <PlannerForm projectId={activeProject?.id} />
      <article className="rounded-2xl border border-[#dce4dd] bg-white p-7">
        <h2 className="font-serif text-2xl">Pending drafts</h2>
        <div className="mt-5 grid gap-4">
          {overview.planningDrafts.length ? overview.planningDrafts.map((draft) => {
            const proposal = draft.proposal as { milestones?: Array<{ title: string; outcome?: string }> };
            return <div className="rounded-lg bg-[#f5f7f2] p-4" key={draft.id}>
              <p className="text-sm font-bold">{proposal.milestones?.[0]?.title ?? "Planning draft"}</p>
              <p className="mt-1 text-xs text-[#64726b]">{proposal.milestones?.length ?? 0} milestones ready to approve</p>
              <div className="mt-3"><ApproveDraftButton draftId={draft.id} /></div>
            </div>;
          }) : <p className="text-sm text-[#64726b]">No pending drafts.</p>}
        </div>
      </article>
    </section>
  </DashboardShell>;
}