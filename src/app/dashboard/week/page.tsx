import { ConfigErrorCard, DashboardShell, EmptyWorkspaceCard, PageHeader } from "../_components/shell";
import { loadOverview } from "../_components/data";
import { WeeklyPlannerForm } from "./weekly-planner-form";

export default async function WeekPage() {
  const { overview, error } = await loadOverview();
  if (error) return <ConfigErrorCard message={error} />;
  if (!overview?.vision) return <EmptyWorkspaceCard />;

  const starterTargets = overview.tasks
    .filter((task) => task.status !== "done")
    .slice(0, 5)
    .map((task) => ({ id: task.id, label: task.title, done: task.status === "done" }));

  return <DashboardShell active="Weekly planning">
    <PageHeader eyebrow="EXECUTION OS" title="Weekly planning">
      Build the week from a clear focus, daily execution blocks, outreach, and a Friday definition of done.
    </PageHeader>
    <WeeklyPlannerForm starterTargets={starterTargets} />
  </DashboardShell>;
}
