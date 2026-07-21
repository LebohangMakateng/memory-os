import { OpportunityForm } from "../dashboard-actions";
import { OpportunityManager } from "./opportunity-manager";
import { ConfigErrorCard, DashboardShell, EmptyWorkspaceCard, PageHeader } from "../_components/shell";
import { loadOverview } from "../_components/data";

export default async function OpportunitiesPage() {
  const { overview, error } = await loadOverview();
  if (error) return <ConfigErrorCard message={error} />;
  if (!overview?.vision) return <EmptyWorkspaceCard />;

  return <DashboardShell active="Opportunities">
    <PageHeader eyebrow="OPPORTUNITY INBOX" title="Capture without derailing the week">Ideas belong here until review, not inside today&apos;s focus.</PageHeader>
    <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <article className="rounded-2xl border border-[#dce4dd] bg-white p-7"><h2 className="font-serif text-2xl">New inbox item</h2><OpportunityForm /></article>
      <article className="rounded-2xl border border-[#dce4dd] bg-white p-7"><h2 className="font-serif text-2xl">Inbox</h2><OpportunityManager opportunities={overview.opportunities} /></article>
    </section>
  </DashboardShell>;
}