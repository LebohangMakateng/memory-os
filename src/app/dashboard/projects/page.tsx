import { ConfigErrorCard, DashboardShell, EmptyWorkspaceCard, PageHeader } from "../_components/shell";
import { loadOverview, statusLabel } from "../_components/data";

export default async function ProjectsPage() {
  const { overview, error } = await loadOverview();
  if (error) return <ConfigErrorCard message={error} />;
  if (!overview?.vision) return <EmptyWorkspaceCard />;

  return <DashboardShell active="Projects">
    <PageHeader eyebrow="PROJECTS" title="Active projects">Each project should connect back to an initiative and produce visible work.</PageHeader>
    <section className="grid gap-5 md:grid-cols-2">
      {overview.projects.map((project) => <article className="rounded-2xl border border-[#dce4dd] bg-white p-7" key={project.id}>
        <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">{statusLabel(project.shareStatus)}</p>
        <h2 className="mt-2 font-serif text-2xl">{project.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#64726b]">{project.purpose}</p>
        <div className="mt-5 grid gap-2">
          {overview.milestones.filter((milestone) => milestone.projectId === project.id).map((milestone) => <div className="rounded-lg bg-[#f5f7f2] p-3" key={milestone.id}>
            <p className="text-sm font-bold">{milestone.title}</p>
            <p className="mt-1 text-xs text-[#64726b]">{milestone.outcome}</p>
          </div>)}
        </div>
      </article>)}
    </section>
  </DashboardShell>;
}