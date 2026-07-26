"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, parseMoneyToCents } from "@/lib/finance/calculations";
import type { FinanceAccount, FinanceCategory } from "@/lib/finance/types";

type Props = {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  analytics: { category: FinanceCategory; actualCents: number; plannedCents: number; varianceCents: number; usedPct: number | null }[];
  merchants: { merchant: string; count: number; totalCents: number }[];
  goals: any[];
  recurringExpenses: any[];
  commitments: any[];
  netWorthSnapshots: any[];
  forecast: { projectedExpensesCents: number; commitmentCents: number; recurringCents: number; projectedEndCents: number };
  review: { title: string; score: number; scoreLabel: string; whatImproved: string[]; whatDeteriorated: string[]; biggestMoneyLeaks: string[]; budgetMisses: string[]; forecast: string; priorities: string[] };
  score: number;
  month: string;
};

type PreviewRow = { id: string; transaction_date: string; description: string; normalized_merchant: string | null; amount: string; transaction_type: string; category_id: string | null; duplicate_status: string; confidence: string | number; excluded?: boolean };

const inputClass = "rounded-lg border border-[#cad5cb] bg-white px-3 py-2 text-sm outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]";
const labelClass = "grid gap-1 text-xs font-bold text-[#32443a]";
const primaryButton = "rounded-lg bg-[#163c30] px-4 py-2 text-sm font-bold text-white disabled:opacity-60";
const secondaryButton = "rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30] disabled:opacity-60";

async function parseJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Request failed.");
  return body;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function categoryOptions(categories: FinanceCategory[]) {
  return <><option value="">Uncategorised</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</>;
}

export function FinanceAdvancedWorkspace(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [previewImportId, setPreviewImportId] = useState("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [comparisonResult, setComparisonResult] = useState("");
  const [checkInResult, setCheckInResult] = useState("");
  const [scenarioResult, setScenarioResult] = useState("");

  function mutate(operation: () => Promise<void>, success: string) {
    setError("");
    setSaved("");
    startTransition(async () => {
      try {
        await operation();
        setSaved(success);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Request failed.");
      }
    });
  }

  function postForm(event: FormEvent<HTMLFormElement>, url: string, payload: (data: FormData) => Record<string, unknown>, success: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    mutate(async () => {
      await parseJson(await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(data)) }));
      form.reset();
    }, success);
  }

  function previewStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    mutate(async () => {
      const result = await parseJson(await fetch("/api/finance/statements/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: data.get("accountId"), sourceName: data.get("sourceName") || "Statement paste", text: data.get("text") }),
      })) as { import: { id: string }; rows: PreviewRow[] };
      setPreviewImportId(result.import.id);
      setPreviewRows(result.rows);
    }, "Statement preview created.");
  }

  function uploadPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    mutate(async () => {
      const result = await parseJson(await fetch("/api/finance/statements/pdf", { method: "POST", body: data })) as { text: string };
      const target = form.querySelector("textarea[name=textOutput]") as HTMLTextAreaElement | null;
      if (target) target.value = result.text;
    }, "PDF text extracted. Paste it into import preview if it looks correct.");
  }

  function loadComparison() {
    mutate(async () => { const result = await parseJson(await fetch("/api/finance/comparison")); setComparisonResult(JSON.stringify(result, null, 2)); }, "Historical comparison loaded.");
  }

  function loadCheckIn() {
    mutate(async () => { const result = await parseJson(await fetch("/api/finance/weekly-check-in")); setCheckInResult(JSON.stringify(result, null, 2)); }, "Weekly check-in loaded.");
  }

  function runScenarioForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutate(async () => { const result = await parseJson(await fetch("/api/finance/scenario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ incomeDelta: data.get("incomeDelta") || "0.00", expenseDelta: data.get("expenseDelta") || "0.00", savingsDelta: data.get("savingsDelta") || "0.00" }) })); setScenarioResult(JSON.stringify(result, null, 2)); }, "Scenario calculated without modifying records.");
  }

  function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutate(async () => { await parseJson(await fetch("/api/finance/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paydayDay: data.get("paydayDay") ? Number(data.get("paydayDay")) : null, riskTolerance: data.get("riskTolerance"), assistantTone: data.get("assistantTone"), savingsPriority: data.get("savingsPriority") || null, strictCategories: [] }) })); }, "Preferences saved.");
  }

  function deleteRecord(url: string) {
    mutate(async () => { await parseJson(await fetch(url, { method: "DELETE" })); }, "Record deleted.");
  }

  function quickEditRecord(url: string, currentName: string, currentAmount: string, amountField = "amount") {
    const name = window.prompt("Name", currentName);
    if (name === null) return;
    const amount = window.prompt("Amount in rand", currentAmount);
    if (amount === null) return;
    mutate(async () => { await parseJson(await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, [amountField]: amount }) })); }, "Record updated.");
  }

  function importStatement() {
    mutate(async () => {
      await parseJson(await fetch("/api/finance/statements/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: previewImportId, rows: previewRows.map((row) => ({ id: row.id, categoryId: row.category_id, normalizedMerchant: row.normalized_merchant, excluded: !!row.excluded })) }),
      }));
      setPreviewRows([]);
      setPreviewImportId("");
    }, "Statement rows imported.");
  }

  return <section className="mt-6 grid gap-6">
    {(error || saved) ? <div className="rounded-lg border border-[#cad5cb] bg-white px-4 py-3 text-sm font-bold">{saved ? <p className="text-[#163c30]">{saved}</p> : null}{error ? <p className="text-red-700">{error}</p> : null}</div> : null}

    <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <article className="scroll-mt-28 rounded-2xl border border-[#dce4dd] bg-white p-6" id="finance-analytics">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Analytics</p>
        <h2 className="mt-2 font-serif text-2xl">Financial health: {props.score}/100</h2>
        <p className="mt-2 text-sm font-bold text-[#163c30]">{props.review.scoreLabel}</p>
        <div className="mt-5 grid gap-3">
          {props.analytics.slice(0, 8).map((row) => <div className="rounded-xl bg-[#f5f7f2] p-4" key={row.category.id}>
            <div className="flex justify-between gap-3"><p className="text-sm font-bold">{row.category.name}</p><p className="text-sm font-bold">{formatCurrency(row.actualCents)}</p></div>
            <p className="mt-1 text-xs text-[#64726b]">Planned {formatCurrency(row.plannedCents)} · Variance {formatCurrency(row.varianceCents)}{row.usedPct !== null ? " · " + row.usedPct + "% used" : ""}</p>
          </div>)}
        </div>
      </article>

      <article className="scroll-mt-28 rounded-2xl border border-[#dce4dd] bg-white p-6" id="finance-forecast">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Forecast</p>
        <h2 className="mt-2 font-serif text-2xl">Projected month end</h2>
        <p className="mt-4 text-3xl font-black">{formatCurrency(props.forecast.projectedEndCents)}</p>
        <div className="mt-5 grid gap-2 text-sm text-[#64726b]">
          <p>Projected expenses: <strong>{formatCurrency(props.forecast.projectedExpensesCents)}</strong></p>
          <p>Known commitments: <strong>{formatCurrency(props.forecast.commitmentCents)}</strong></p>
          <p>Recurring expenses: <strong>{formatCurrency(props.forecast.recurringCents)}</strong></p>
        </div>
        <div className="mt-5 rounded-xl bg-[#f5f7f2] p-4 text-sm leading-6 text-[#64726b]">{props.review.forecast}</div>
      </article>
    </section>

    <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <form className="scroll-mt-28 grid gap-4 rounded-2xl border border-[#dce4dd] bg-white p-6" id="finance-pdf" onSubmit={uploadPdf}>
        <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">PDF extraction</p><h2 className="mt-2 font-serif text-2xl">Upload PDF</h2></div>
        <input accept="application/pdf" className={inputClass} name="file" required type="file" />
        <button className={primaryButton} disabled={pending} type="submit">Extract PDF text</button>
        <label className={labelClass}>Extracted text<textarea className={inputClass + " min-h-32"} name="textOutput" readOnly /></label>
      </form>

      <form className="scroll-mt-28 grid gap-4 rounded-2xl border border-[#dce4dd] bg-white p-6" id="finance-statements" onSubmit={previewStatement}>
        <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Statements</p><h2 className="mt-2 font-serif text-2xl">Import preview</h2></div>
        <label className={labelClass}>Account<select className={inputClass} name="accountId" required><option value="">Choose account</option>{props.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label className={labelClass}>Source name<input className={inputClass} name="sourceName" placeholder="July bank statement" /></label>
        <label className={labelClass}>Statement text<textarea className={inputClass + " min-h-40"} name="text" placeholder="2026-07-25 UBER TRIP -187.00" required /></label>
        <button className={primaryButton} disabled={pending || !props.accounts.length} type="submit">Preview import</button>
      </form>

      <article className="scroll-mt-28 rounded-2xl border border-[#dce4dd] bg-white p-6" id="finance-review">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Review</p>
        <h2 className="mt-2 font-serif text-2xl">Monthly review</h2>
        <div className="mt-5 grid gap-3 text-sm leading-6 text-[#64726b]">
          {props.review.biggestMoneyLeaks.length ? props.review.biggestMoneyLeaks.map((item) => <p className="rounded-xl bg-[#f5f7f2] p-3" key={item}>{item}</p>) : <p className="rounded-xl bg-[#f5f7f2] p-3">No obvious money leaks yet.</p>}
          {props.review.priorities.map((item) => <p key={item}>Priority: {item}</p>)}
        </div>
      </article>
    </section>

    {previewRows.length ? <article className="rounded-2xl border border-[#dce4dd] bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-2xl">Import rows</h2><button className={primaryButton} disabled={pending} onClick={importStatement} type="button">Import selected</button></div>
      <div className="mt-5 grid gap-3">
        {previewRows.map((row, index) => <div className="grid gap-2 rounded-xl bg-[#f5f7f2] p-4 md:grid-cols-[80px_1fr_120px_150px_90px]" key={row.id}>
          <p className="text-xs font-bold">{row.transaction_date}</p>
          <input className={inputClass} value={row.normalized_merchant ?? row.description} onChange={(event) => setPreviewRows((current) => current.map((item, i) => i === index ? { ...item, normalized_merchant: event.target.value } : item))} />
          <p className="text-sm font-bold">{row.transaction_type === "expense" ? "-" : "+"}{formatCurrency(parseMoneyToCents(row.amount))}</p>
          <select className={inputClass} value={row.category_id ?? ""} onChange={(event) => setPreviewRows((current) => current.map((item, i) => i === index ? { ...item, category_id: event.target.value || null } : item))}>{categoryOptions(props.categories)}</select>
          <label className="flex items-center gap-2 text-xs font-bold"><input checked={!!row.excluded || row.duplicate_status === "duplicate"} onChange={(event) => setPreviewRows((current) => current.map((item, i) => i === index ? { ...item, excluded: event.target.checked } : item))} type="checkbox" /> Skip</label>
        </div>)}
      </div>
    </article> : null}

    <section className="grid gap-6 xl:grid-cols-3">
      <article className="scroll-mt-28 rounded-2xl border border-[#dce4dd] bg-white p-6 xl:col-span-3" id="finance-planning-tools">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Planning tools</p>
        <h2 className="mt-2 font-serif text-2xl">Compare, check in, and model scenarios</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="grid gap-3"><button className={secondaryButton} onClick={loadComparison} type="button">Historical comparison</button><pre className="max-h-48 overflow-auto rounded-lg bg-[#f5f7f2] p-3 text-xs">{comparisonResult || "No comparison loaded."}</pre></div>
          <div className="grid gap-3"><button className={secondaryButton} onClick={loadCheckIn} type="button">Weekly check-in</button><pre className="max-h-48 overflow-auto rounded-lg bg-[#f5f7f2] p-3 text-xs">{checkInResult || "No check-in loaded."}</pre></div>
          <form className="grid gap-3" onSubmit={runScenarioForm}><input className={inputClass} name="incomeDelta" placeholder="Income change R" /><input className={inputClass} name="expenseDelta" placeholder="Expense increase/cut R" /><input className={inputClass} name="savingsDelta" placeholder="Savings increase R" /><button className={secondaryButton} type="submit">Run scenario</button><pre className="max-h-48 overflow-auto rounded-lg bg-[#f5f7f2] p-3 text-xs">{scenarioResult || "No scenario run."}</pre></form>
        </div>
      </article>
      <div className="scroll-mt-28 contents" id="finance-goals"><CreateCard title="Savings goal" onSubmit={(event) => postForm(event, "/api/finance/goals", (data) => ({ name: data.get("name"), goalType: data.get("goalType"), targetAmount: data.get("targetAmount"), currentAmount: data.get("currentAmount") || "0.00", targetDate: data.get("targetDate") || null, monthlyContribution: data.get("monthlyContribution") || "0.00", priority: Number(data.get("priority") || 3) }), "Goal saved.") }>
        <label className={labelClass}>Name<input className={inputClass} name="name" required /></label>
        <label className={labelClass}>Type<select className={inputClass} name="goalType"><option value="savings">Savings</option><option value="emergency_fund">Emergency fund</option><option value="travel">Travel</option><option value="investment">Investment</option><option value="debt_payoff">Debt payoff</option></select></label>
        <label className={labelClass}>Target (R)<input className={inputClass} name="targetAmount" required /></label>
        <label className={labelClass}>Current (R)<input className={inputClass} defaultValue="0.00" name="currentAmount" /></label>
        <label className={labelClass}>Monthly contribution (R)<input className={inputClass} defaultValue="0.00" name="monthlyContribution" /></label>
        <label className={labelClass}>Target date<input className={inputClass} name="targetDate" type="date" /></label>
        <label className={labelClass}>Priority<input className={inputClass} defaultValue="3" max="5" min="1" name="priority" type="number" /></label>
      </CreateCard></div>

      <CreateCard title="Recurring expense" onSubmit={(event) => postForm(event, "/api/finance/recurring-expenses", (data) => ({ name: data.get("name"), merchant: data.get("merchant") || null, categoryId: data.get("categoryId") || null, amount: data.get("amount"), frequency: data.get("frequency"), nextDueDate: data.get("nextDueDate") || null }), "Recurring expense saved.") }>
        <label className={labelClass}>Name<input className={inputClass} name="name" required /></label>
        <label className={labelClass}>Merchant<input className={inputClass} name="merchant" /></label>
        <label className={labelClass}>Amount (R)<input className={inputClass} name="amount" required /></label>
        <label className={labelClass}>Frequency<select className={inputClass} name="frequency"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></label>
        <label className={labelClass}>Category<select className={inputClass} name="categoryId">{categoryOptions(props.categories)}</select></label>
        <label className={labelClass}>Next due<input className={inputClass} name="nextDueDate" type="date" /></label>
      </CreateCard>

      <CreateCard title="Commitment" onSubmit={(event) => postForm(event, "/api/finance/commitments", (data) => ({ name: data.get("name"), amount: data.get("amount"), dueDate: data.get("dueDate"), categoryId: data.get("categoryId") || null, notes: data.get("notes") || null }), "Commitment saved.") }>
        <label className={labelClass}>Name<input className={inputClass} name="name" required /></label>
        <label className={labelClass}>Amount (R)<input className={inputClass} name="amount" required /></label>
        <label className={labelClass}>Due date<input className={inputClass} defaultValue={todayDate()} name="dueDate" required type="date" /></label>
        <label className={labelClass}>Category<select className={inputClass} name="categoryId">{categoryOptions(props.categories)}</select></label>
        <label className={labelClass}>Notes<textarea className={inputClass + " min-h-20"} name="notes" /></label>
      </CreateCard>
    </section>

    <section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <form className="scroll-mt-28 grid gap-4 rounded-2xl border border-[#dce4dd] bg-white p-6 xl:col-span-2" id="finance-settings" onSubmit={savePreferences}>
        <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">AI memory</p><h2 className="mt-2 font-serif text-2xl">Finance preferences</h2></div>
        <div className="grid gap-3 md:grid-cols-4"><label className={labelClass}>Payday<input className={inputClass} max="31" min="1" name="paydayDay" type="number" /></label><label className={labelClass}>Risk<select className={inputClass} name="riskTolerance"><option value="moderate">Moderate</option><option value="low">Low</option><option value="high">High</option></select></label><label className={labelClass}>Tone<select className={inputClass} name="assistantTone"><option value="direct">Direct</option><option value="gentle">Gentle</option><option value="strict">Strict</option></select></label><label className={labelClass}>Savings priority<input className={inputClass} name="savingsPriority" /></label></div>
        <button className={primaryButton} type="submit">Save preferences</button>
      </form>
      <div className="scroll-mt-28 contents" id="finance-net-worth"><CreateCard title="Net worth snapshot" onSubmit={(event) => postForm(event, "/api/finance/net-worth", (data) => ({ snapshotDate: data.get("snapshotDate"), cashAmount: data.get("cashAmount") || "0.00", investmentAmount: data.get("investmentAmount") || "0.00", assetAmount: data.get("assetAmount") || "0.00", debtAmount: data.get("debtAmount") || "0.00", notes: data.get("notes") || null }), "Net worth snapshot saved.") }>
        <label className={labelClass}>Date<input className={inputClass} defaultValue={todayDate()} name="snapshotDate" required type="date" /></label>
        <label className={labelClass}>Cash (R)<input className={inputClass} defaultValue="0.00" name="cashAmount" /></label>
        <label className={labelClass}>Investments (R)<input className={inputClass} defaultValue="0.00" name="investmentAmount" /></label>
        <label className={labelClass}>Assets (R)<input className={inputClass} defaultValue="0.00" name="assetAmount" /></label>
        <label className={labelClass}>Debt (R)<input className={inputClass} defaultValue="0.00" name="debtAmount" /></label>
      </CreateCard></div>

      <article className="scroll-mt-28 rounded-2xl border border-[#dce4dd] bg-white p-6" id="finance-records">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Records</p>
        <h2 className="mt-2 font-serif text-2xl">Planning inventory</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ManageList title="Goals" rows={props.goals.map((goal) => ({ id: goal.id, label: goal.name + " · " + formatCurrency(parseMoneyToCents(goal.current_amount)) + " / " + formatCurrency(parseMoneyToCents(goal.target_amount)), edit: () => quickEditRecord("/api/finance/goals/" + goal.id, goal.name, String(goal.target_amount), "targetAmount"), del: () => deleteRecord("/api/finance/goals/" + goal.id) }))} />
          <ManageList title="Recurring" rows={props.recurringExpenses.map((item) => ({ id: item.id, label: item.name + " · " + formatCurrency(parseMoneyToCents(item.amount)) + " " + item.frequency, edit: () => quickEditRecord("/api/finance/recurring-expenses/" + item.id, item.name, String(item.amount)), del: () => deleteRecord("/api/finance/recurring-expenses/" + item.id) }))} />
          <ManageList title="Commitments" rows={props.commitments.map((item) => ({ id: item.id, label: item.name + " · " + formatCurrency(parseMoneyToCents(item.amount)) + " due " + item.due_date, edit: () => quickEditRecord("/api/finance/commitments/" + item.id, item.name, String(item.amount)), del: () => deleteRecord("/api/finance/commitments/" + item.id) }))} />
        </div>
      </article>
    </section>
  </section>;
}

function CreateCard({ title, children, onSubmit }: { title: string; children: React.ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="grid gap-4 rounded-2xl border border-[#dce4dd] bg-white p-6" onSubmit={onSubmit}>
    <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Plan forward</p><h2 className="mt-2 font-serif text-2xl">{title}</h2></div>
    {children}
    <button className={primaryButton} type="submit">Save</button>
  </form>;
}

function ManageList({ title, rows }: { title: string; rows: { id: string; label: string; edit: () => void; del: () => void }[] }) {
  return <div className="rounded-xl bg-[#f5f7f2] p-4"><p className="text-sm font-bold text-[#16231e]">{title}</p><div className="mt-3 grid gap-3 text-xs leading-5 text-[#64726b]">{rows.length ? rows.map((row) => <div className="grid gap-2" key={row.id}><p>{row.label}</p><div className="flex gap-2"><button className={secondaryButton} onClick={row.edit} type="button">Edit</button><button className={secondaryButton} onClick={row.del} type="button">Delete</button></div></div>) : <p>None recorded.</p>}</div></div>;
}
