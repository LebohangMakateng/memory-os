import { requireSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { currentFinanceMonth, summarizeCategoryActuals, summarizeFinance } from "@/lib/finance/calculations";
import type { FinanceAccount, FinanceBudgetLine, FinanceCategory, FinanceMonthlyPlan, FinanceTransaction } from "@/lib/finance/types";
import { ConfigErrorCard, DashboardShell, PageHeader } from "../_components/shell";
import { FinanceWorkspace } from "./finance-workspace";
import { FinanceAdvancedWorkspace } from "./finance-advanced-workspace";
import { categoryAnalytics, financialHealthScore, forecastMonth, merchantAnalytics, monthlyReview } from "@/lib/finance/analytics";

const ownerId = "owner";

type FinanceData = {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  plan: FinanceMonthlyPlan | null;
  budgetLines: FinanceBudgetLine[];
  month: string;
  goals: any[];
  recurringExpenses: any[];
  commitments: any[];
  netWorthSnapshots: any[];
  error: string;
};

async function loadFinanceData(): Promise<FinanceData> {
  await requireSession();
  const supabase = getSupabaseAdmin();
  const month = currentFinanceMonth();

  const [accountsResult, categoriesResult, transactionsResult, planResult, goalsResult, recurringResult, commitmentsResult, netWorthResult] = await Promise.all([
    supabase.from("finance_accounts").select("*").eq("owner_id", ownerId).eq("is_active", true).order("created_at", { ascending: true }),
    supabase.from("finance_categories").select("*").eq("owner_id", ownerId).eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("finance_transactions").select("*").eq("owner_id", ownerId).eq("financial_month", month).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("finance_monthly_plans").select("*").eq("owner_id", ownerId).eq("month", month).maybeSingle(),
    supabase.from("finance_goals").select("*").eq("owner_id", ownerId).order("priority", { ascending: true }),
    supabase.from("finance_recurring_expenses").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }),
    supabase.from("finance_commitments").select("*").eq("owner_id", ownerId).order("due_date", { ascending: true }),
    supabase.from("finance_net_worth_snapshots").select("*").eq("owner_id", ownerId).order("snapshot_date", { ascending: false }).limit(12),
  ]);

  const error = accountsResult.error?.message || categoriesResult.error?.message || transactionsResult.error?.message || planResult.error?.message || goalsResult.error?.message || recurringResult.error?.message || commitmentsResult.error?.message || netWorthResult.error?.message || "";
  if (error) return { accounts: [], categories: [], transactions: [], plan: null, budgetLines: [], goals: [], recurringExpenses: [], commitments: [], netWorthSnapshots: [], month, error };

  let budgetLines: FinanceBudgetLine[] = [];
  if (planResult.data?.id) {
    const budgetResult = await supabase.from("finance_budget_lines").select("*").eq("plan_id", planResult.data.id);
    if (budgetResult.error) return { accounts: [], categories: [], transactions: [], plan: null, budgetLines: [], goals: [], recurringExpenses: [], commitments: [], netWorthSnapshots: [], month, error: budgetResult.error.message };
    budgetLines = (budgetResult.data ?? []) as FinanceBudgetLine[];
  }

  return {
    accounts: (accountsResult.data ?? []) as FinanceAccount[],
    categories: (categoriesResult.data ?? []) as FinanceCategory[],
    transactions: (transactionsResult.data ?? []) as FinanceTransaction[],
    plan: planResult.data as FinanceMonthlyPlan | null,
    budgetLines,
    goals: goalsResult.data ?? [],
    recurringExpenses: recurringResult.data ?? [],
    commitments: commitmentsResult.data ?? [],
    netWorthSnapshots: netWorthResult.data ?? [],
    month,
    error: "",
  };
}

export default async function FinancePage() {
  const data = await loadFinanceData();
  if (data.error) return <ConfigErrorCard message={data.error} />;

  const summary = summarizeFinance({ transactions: data.transactions, plan: data.plan, budgetLines: data.budgetLines });
  const categoryActuals = Object.fromEntries(summarizeCategoryActuals(data.transactions));
  const analytics = categoryAnalytics(data.transactions, data.categories, data.budgetLines);
  const merchants = merchantAnalytics(data.transactions);
  const forecast = forecastMonth({ transactions: data.transactions, plan: data.plan, budgetLines: data.budgetLines, commitments: data.commitments, recurringExpenses: data.recurringExpenses });
  const score = financialHealthScore({ transactions: data.transactions, plan: data.plan, budgetLines: data.budgetLines, goals: data.goals, recurringExpenses: data.recurringExpenses });
  const review = monthlyReview({ month: data.month, transactions: data.transactions, categories: data.categories, plan: data.plan, budgetLines: data.budgetLines, goals: data.goals, commitments: data.commitments, recurringExpenses: data.recurringExpenses });

  return <DashboardShell active="Finance">
    <FinanceTopMenu />
    <FunctionalGroup eyebrow="OPERATE" title="Assistant, overview, accounts, transactions, and monthly plan">
      <FinanceWorkspace {...data} categoryActuals={categoryActuals} summary={summary} />
    </FunctionalGroup>
    <FunctionalGroup eyebrow="ANALYSE + PLAN" title="Statements, analytics, forecasting, goals, commitments, and settings">
      <FinanceAdvancedWorkspace accounts={data.accounts} analytics={analytics} categories={data.categories} commitments={data.commitments} forecast={forecast} goals={data.goals} merchants={merchants} month={data.month} netWorthSnapshots={data.netWorthSnapshots} recurringExpenses={data.recurringExpenses} review={review} score={score} />
    </FunctionalGroup>
  </DashboardShell>;
}


function FinanceTopMenu() {
  const items = [
    { href: "#finance-assistant", label: "Assistant" },
    { href: "#finance-overview", label: "Overview" },
    { href: "#finance-accounts", label: "Accounts" },
    { href: "#finance-transactions", label: "Transactions" },
    { href: "#finance-monthly-plan", label: "Monthly Plan" },
    { href: "#finance-statements", label: "Statements" },
    { href: "#finance-analytics", label: "Analytics" },
    { href: "#finance-forecast", label: "Forecast" },
    { href: "#finance-goals", label: "Goals" },
    { href: "#finance-planning-tools", label: "Scenarios" },
    { href: "#finance-settings", label: "Settings" },
  ];

  return <nav className="sticky top-0 z-20 mb-8 -mx-5 border-y border-[#dce4dd] bg-[#f5f7f2]/95 px-5 py-3 backdrop-blur md:-mx-14 md:px-14" aria-label="Finance sections">
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => <a className="shrink-0 rounded-lg border border-[#cad5cb] bg-white px-3 py-2 text-xs font-bold text-[#163c30] hover:border-[#163c30]" href={item.href} key={item.href}>{item.label}</a>)}
    </div>
  </nav>;
}

function FunctionalGroup({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="mb-8 grid gap-5">
    <header className="border-b border-[#dce4dd] pb-3">
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-2xl text-[#16231e]">{title}</h2>
    </header>
    {children}
  </section>;
}
