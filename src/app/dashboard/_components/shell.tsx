import Link from "next/link";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string; active?: boolean };

const defaultItems: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/dashboard/week", label: "Weekly planning" },
  { href: "/dashboard/week/history", label: "Weekly history" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/opportunities", label: "Opportunities" },
  { href: "/dashboard/planning", label: "AI planning" },
];

export function DashboardShell({ children, active }: { children: ReactNode; active: string }) {
  const items = defaultItems.map((item) => ({ ...item, active: item.label === active }));
  return <main className="min-h-screen bg-[#f5f7f2] text-[#16231e] md:grid md:grid-cols-[236px_1fr]">
    <aside className="hidden min-h-screen flex-col bg-[#163c30] px-5 py-8 text-[#eef5e9] md:flex">
      <Link className="mb-14 px-3 text-2xl font-black tracking-[-.12em]" href="/">E<span className="text-[#d8ef61]">.</span>OS</Link>
      <nav className="grid gap-1 text-sm">
        {items.map((item) => <Link className={item.active ? "rounded-lg bg-white/10 px-3 py-3 font-bold" : "rounded-lg px-3 py-3 text-[#bbcac0]"} href={item.href} key={item.href}>{item.label}</Link>)}
      </nav>
      <div className="mt-auto border-t border-white/15 px-3 pt-5">
        <p className="mb-2 text-[10px] font-bold tracking-[.14em] text-[#9db2a5]">OPERATING PRINCIPLE</p>
        <p className="font-serif text-lg leading-tight">Share everything<br />I build.</p>
      </div>
    </aside>
    <section className="mx-auto w-full max-w-6xl px-5 py-9 md:px-14 md:py-12">
      <div className="mb-6 flex gap-2 overflow-x-auto md:hidden">
        {items.map((item) => <Link className={item.active ? "shrink-0 rounded-lg bg-[#163c30] px-3 py-2 text-xs font-bold text-white" : "shrink-0 rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30]"} href={item.href} key={item.href}>{item.label}</Link>)}
      </div>
      {children}
    </section>
  </main>;
}

export function PageHeader({ eyebrow, title, children, action }: { eyebrow: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
    <div>
      <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">{title}</h1>
      {children ? <div className="mt-3 max-w-2xl text-sm leading-6 text-[#64726b]">{children}</div> : null}
    </div>
    {action}
  </header>;
}

export function EmptyWorkspaceCard() {
  return <DashboardShell active="Overview">
    <section className="grid max-w-3xl gap-6 rounded-2xl border border-[#dce4dd] bg-white p-8">
      <div>
        <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">EXECUTION OS</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Create your starter workspace.</h1>
        <p className="mt-4 text-sm leading-6 text-[#64726b]">Your Supabase database is connected, but there is no execution data yet. This creates the starter vision, goal, project, weekly priorities, and tasks so the app becomes usable immediately.</p>
      </div>
    </section>
  </DashboardShell>;
}

export function ConfigErrorCard({ message }: { message: string }) {
  return <main className="min-h-screen bg-[#f5f7f2] px-5 py-10 text-[#16231e]">
    <section className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-8">
      <p className="text-[10px] font-bold tracking-[.14em] text-red-700">SETUP REQUIRED</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">The app cannot load the database yet.</h1>
      <p className="mt-4 text-sm leading-6 text-[#64726b]">{message}</p>
      <p className="mt-4 rounded-lg bg-[#f5f7f2] p-4 font-mono text-xs">Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and in your deployment environment.</p>
    </section>
  </main>;
}