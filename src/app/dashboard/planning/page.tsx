import { PlannerForm } from "../dashboard-actions";
import { ConfigErrorCard, DashboardShell, EmptyWorkspaceCard, PageHeader } from "../_components/shell";
import { loadOverview } from "../_components/data";
import { PlanningDraftManager } from "./planning-draft-manager";

export default async function PlanningPage() {
  const { overview, error } = await loadOverview();
  if (error) return <ConfigErrorCard message={error} />;
  if (!overview?.vision) return <EmptyWorkspaceCard />;
  const activeProject = overview.projects[0];

  return <DashboardShell active="AI planning">
    <PageHeader eyebrow="AI PLANNING" title="Plan with Claude">Draft milestones and tasks, then approve only what should become real work.</PageHeader>
    <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <PlannerForm projectId={activeProject?.id} />
      <PlanningDraftManager drafts={overview.planningDrafts} />
    </section>
  </DashboardShell>;
}
