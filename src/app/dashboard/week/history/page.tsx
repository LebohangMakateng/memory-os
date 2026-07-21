import Link from "next/link";
import { ConfigErrorCard, DashboardShell, EmptyWorkspaceCard, PageHeader } from "../../_components/shell";
import { loadOverview } from "../../_components/data";
import { WeeklyHistoryList } from "./weekly-history-list";

export default async function WeeklyHistoryPage() {
  const { overview, error } = await loadOverview();
  if (error) return <ConfigErrorCard message={error} />;
  if (!overview?.vision) return <EmptyWorkspaceCard />;

  return <DashboardShell active="Weekly history">
    <PageHeader eyebrow="EXECUTION OS" title="Weekly history" action={<Link className="rounded-lg border border-[#cad5cb] bg-white px-4 py-3 text-sm font-bold text-[#163c30]" href="/dashboard/week">Current week</Link>}>
      Review saved weekly dashboards from previous Sunday-start weeks.
    </PageHeader>
    <WeeklyHistoryList />
  </DashboardShell>;
}