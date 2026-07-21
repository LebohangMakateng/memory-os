import { ConfigErrorCard, DashboardShell, EmptyWorkspaceCard, PageHeader } from "../_components/shell";
import { loadOverview } from "../_components/data";
import { ProjectBoard } from "./project-board";

export default async function ProjectsPage() {
  const { overview, error } = await loadOverview();
  if (error) return <ConfigErrorCard message={error} />;
  if (!overview?.vision) return <EmptyWorkspaceCard />;

  return <DashboardShell active="Projects">
    <PageHeader eyebrow="PROJECTS" title="Active projects">Each project should connect back to an initiative and produce visible work.</PageHeader>
    <ProjectBoard initiatives={overview.initiatives} milestones={overview.milestones} projects={overview.projects} />
  </DashboardShell>;
}
