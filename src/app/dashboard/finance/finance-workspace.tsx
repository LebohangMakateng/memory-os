"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FinanceAssistant } from "./finance-assistant";
import { centsToMoney, formatCurrency, parseMoneyToCents } from "@/lib/finance/calculations";
import type { FinanceAccount, FinanceBudgetLine, FinanceCategory, FinanceMonthlyPlan, FinanceTransaction } from "@/lib/finance/types";

type FinanceSummary = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  plannedIncomeCents: number;
  plannedExpenseCents: number;
  plannedSavingsCents: number;
  remainingSpendableCents: number;
  plannedRemainingCents: number;
  expenseVarianceCents: number;
};

type Props = {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  plan: FinanceMonthlyPlan | null;
  budgetLines: FinanceBudgetLine[];
  month: string;
  summary: FinanceSummary;
  categoryActuals: Record<string, number>;
};

const inputClass = "rounded-lg border border-[#cad5cb]/70 bg-white/70 backdrop-blur-xl px-3 py-2 text-sm outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]";
const labelClass = "grid gap-1 text-xs font-bold text-[#32443a]";
const primaryButton = "rounded-lg bg-[#163c30]/85 backdrop-blur-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60";
const secondaryButton = "rounded-lg border border-[#cad5cb]/70 px-3 py-2 text-xs font-bold text-[#163c30] disabled:opacity-60";

async function parseJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : "Request failed.";
    throw new Error(message);
  }
  return body;
}

function moneyValue(value: string | number | null | undefined) {
  return centsToMoney(parseMoneyToCents(value ?? 0));
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function transactionPayload(form: HTMLFormElement) {
  const data = new FormData(form);
  const categoryId = data.get("categoryId")?.toString() || null;
  return {
    accountId: data.get("accountId")?.toString() ?? "",
    transactionDate: data.get("transactionDate")?.toString() ?? "",
    postedDate: data.get("postedDate")?.toString() || null,
    description: data.get("description")?.toString().trim() ?? "",
    normalizedMerchant: data.get("normalizedMerchant")?.toString().trim() || null,
    amount: data.get("amount")?.toString().trim() ?? "0.00",
    transactionType: data.get("transactionType")?.toString() ?? "expense",
    categoryId,
    notes: data.get("notes")?.toString().trim() || null,
  };
}

function categoryName(categories: FinanceCategory[], categoryId: string | null) {
  return categories.find((category) => category.id === categoryId)?.name ?? "Uncategorised";
}

export function FinanceWorkspace({ accounts, categories, transactions, plan, budgetLines, month, summary, categoryActuals }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState("");
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const expenseCategories = useMemo(() => categories.filter((category) => category.default_transaction_type === "expense"), [categories]);
  const budgetByCategory = useMemo(() => new Map(budgetLines.map((line) => [line.category_id, moneyValue(line.planned_amount)])), [budgetLines]);

  function mutate<T>(operation: () => Promise<T>, success: string) {
    setError("");
    setSaved("");
    startTransition(async () => {
      try {
        await operation();
        setSaved(success);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Request failed.");
      } finally {
        setPendingId("");
      }
    });
  }

  function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    mutate(async () => {
      await parseJson(await fetch("/api/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name")?.toString().trim(),
          accountType: data.get("accountType")?.toString(),
          currency: "ZAR",
          maskedIdentifier: data.get("maskedIdentifier")?.toString().trim() || null,
          openingBalance: data.get("openingBalance")?.toString().trim() || "0.00",
        }),
      }));
      form.reset();
    }, "Account saved.");
  }

  function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const lines = expenseCategories.map((category) => ({
      categoryId: category.id,
      plannedAmount: data.get("budget-" + category.id)?.toString().trim() || "0.00",
    }));
    mutate(async () => {
      await parseJson(await fetch("/api/finance/monthly-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          currency: "ZAR",
          expectedIncome: data.get("expectedIncome")?.toString().trim() || "0.00",
          savingsTarget: data.get("savingsTarget")?.toString().trim() || "0.00",
          notes: data.get("notes")?.toString().trim() || null,
          budgetLines: lines,
        }),
      }));
    }, "Monthly plan saved.");
  }

  function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = transactionPayload(form);
    mutate(async () => {
      await parseJson(await fetch(editing ? "/api/finance/transactions/" + editing.id : "/api/finance/transactions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }));
      setEditing(null);
      form.reset();
    }, editing ? "Transaction updated." : "Transaction saved.");
  }

  function deleteTransaction(transactionId: string) {
    setPendingId(transactionId);
    mutate(async () => {
      await parseJson(await fetch("/api/finance/transactions/" + transactionId, { method: "DELETE" }));
      if (editing?.id === transactionId) setEditing(null);
    }, "Transaction deleted.");
  }

  return <section className="grid gap-6">
    <FinanceAssistant />
    <div className="scroll-mt-28 grid grid-cols-2 gap-3 md:grid-cols-4" id="finance-overview">
      <Metric label="Income" value={formatCurrency(summary.incomeCents)} />
      <Metric label="Expenses" value={formatCurrency(summary.expenseCents)} />
      <Metric label="Remaining after savings" value={formatCurrency(summary.remainingSpendableCents)} />
      <Metric label="Planned spare" value={formatCurrency(summary.plannedRemainingCents)} />
    </div>

    {(error || saved) ? <div className="rounded-lg border border-[#cad5cb]/70 bg-white/70 backdrop-blur-xl px-4 py-3 text-sm font-bold">
      {saved ? <p className="text-[#163c30]">{saved}</p> : null}
      {error ? <p className="text-red-700">{error}</p> : null}
    </div> : null}

    <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <div className="grid gap-6">
        <details className="mobile-disclosure" id="finance-accounts-panel"><summary className="rounded-2xl border border-[#dce4dd]/70 bg-white/70 p-4 text-sm font-bold text-[#163c30] shadow-sm backdrop-blur-xl">Accounts</summary><div className="mobile-disclosure-content mt-3 md:mt-0"><form className="scroll-mt-28 grid gap-4 rounded-2xl border border-[#dce4dd]/70 bg-white/70 backdrop-blur-xl p-6" id="finance-accounts" onSubmit={createAccount}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Accounts</p>
            <h2 className="mt-2 font-serif text-2xl">Add account</h2>
          </div>
          <label className={labelClass}>Name<input className={inputClass} name="name" placeholder="Main cheque account" required /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>Type<select className={inputClass} defaultValue="bank" name="accountType"><option value="bank">Bank</option><option value="cash">Cash</option><option value="credit">Credit</option><option value="savings">Savings</option><option value="investment">Investment</option><option value="other">Other</option></select></label>
            <label className={labelClass}>Currency<input className={inputClass} name="currency" readOnly value="ZAR" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>Masked identifier<input className={inputClass} name="maskedIdentifier" placeholder="****4831" /></label>
            <label className={labelClass}>Opening balance (R)<input className={inputClass} defaultValue="0.00" inputMode="decimal" name="openingBalance" /></label>
          </div>
          <button className={primaryButton} disabled={pending} type="submit">Save account</button>
          <div className="grid gap-2 text-sm text-[#64726b]">
            {accounts.length ? accounts.map((account) => <p className="rounded-lg bg-white/35 backdrop-blur-xl px-3 py-2" key={account.id}>{account.name} <span className="font-bold text-[#163c30]">{account.currency}</span>{account.masked_identifier ? " " + account.masked_identifier : ""}</p>) : <p>No accounts yet.</p>}
          </div>
        </form></div></details>

        <form className="scroll-mt-28 grid gap-4 rounded-2xl border border-[#dce4dd]/70 bg-white/70 backdrop-blur-xl p-6" id="finance-transactions" onSubmit={saveTransaction}>
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Manual record</p><h2 className="mt-2 font-serif text-2xl">{editing ? "Edit transaction" : "Add transaction"}</h2></div>
            {editing ? <button className={secondaryButton} onClick={() => setEditing(null)} type="button">Cancel</button> : null}
          </div>
          <label className={labelClass}>Account<select className={inputClass} defaultValue={editing?.account_id ?? accounts[0]?.id ?? ""} key={editing?.id ?? "new-account"} name="accountId" required><option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>Date<input className={inputClass} defaultValue={editing?.transaction_date ?? todayDate()} key={editing?.id ?? "new-date"} name="transactionDate" required type="date" /></label>
            <label className={labelClass}>Type<select className={inputClass} defaultValue={editing?.transaction_type ?? "expense"} key={editing?.id ?? "new-type"} name="transactionType"><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option><option value="adjustment">Adjustment</option></select></label>
          </div>
          <label className={labelClass}>Description<input className={inputClass} defaultValue={editing?.description ?? ""} key={editing?.id ?? "new-description"} name="description" required /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>Merchant<input className={inputClass} defaultValue={editing?.normalized_merchant ?? ""} key={editing?.id ?? "new-merchant"} name="normalizedMerchant" /></label>
            <label className={labelClass}>Amount (R)<input className={inputClass} defaultValue={editing ? moneyValue(editing.amount) : ""} inputMode="decimal" key={editing?.id ?? "new-amount"} name="amount" placeholder="300.00" required /></label>
          </div>
          <label className={labelClass}>Category<select className={inputClass} defaultValue={editing?.category_id ?? ""} key={editing?.id ?? "new-category"} name="categoryId"><option value="">Uncategorised</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className={labelClass}>Notes<textarea className={inputClass + " min-h-20"} defaultValue={editing?.notes ?? ""} key={editing?.id ?? "new-notes"} name="notes" /></label>
          <button className={primaryButton} disabled={pending || !accounts.length} type="submit">{pending ? "Saving..." : editing ? "Update transaction" : "Save transaction"}</button>
          {!accounts.length ? <p className="text-sm text-[#64726b]">Create an account before adding transactions.</p> : null}
        </form>
      </div>

      <div className="grid gap-6">
        <details className="mobile-disclosure"><summary className="rounded-2xl border border-[#dce4dd]/70 bg-white/70 p-4 text-sm font-bold text-[#163c30] shadow-sm backdrop-blur-xl">Monthly plan</summary><div className="mobile-disclosure-content mt-3 md:mt-0"><form className="scroll-mt-28 grid gap-4 rounded-2xl border border-[#dce4dd]/70 bg-white/70 backdrop-blur-xl p-6" id="finance-monthly-plan" onSubmit={savePlan}>
          <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Monthly plan</p><h2 className="mt-2 font-serif text-2xl">{month}</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelClass}>Expected income (R)<input className={inputClass} defaultValue={moneyValue(plan?.expected_income)} inputMode="decimal" name="expectedIncome" /></label>
            <label className={labelClass}>Savings target (R)<input className={inputClass} defaultValue={moneyValue(plan?.savings_target)} inputMode="decimal" name="savingsTarget" /></label>
            <label className={labelClass}>Currency<input className={inputClass} readOnly value="ZAR" /></label>
          </div>
          <div className="grid gap-2">
            {expenseCategories.map((category) => <div className="grid items-center gap-2 rounded-lg bg-white/35 backdrop-blur-xl p-3 sm:grid-cols-[1fr_130px_130px]" key={category.id}>
              <span className="text-sm font-bold text-[#16231e]">{category.name}</span>
              <span className="text-xs text-[#64726b]">Actual {formatCurrency(categoryActuals[category.id] ?? 0)}</span>
              <input className={inputClass} defaultValue={budgetByCategory.get(category.id) ?? "0.00"} inputMode="decimal" name={"budget-" + category.id} />
            </div>)}
          </div>
          <label className={labelClass}>Notes<textarea className={inputClass + " min-h-20"} defaultValue={plan?.notes ?? ""} name="notes" /></label>
          <button className={primaryButton} disabled={pending} type="submit">Save monthly plan</button>
        </form></div></details>

        <article className="scroll-mt-28 rounded-2xl border border-[#dce4dd]/70 bg-white/70 backdrop-blur-xl p-6" id="finance-transaction-list">
          <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Transactions</p><h2 className="mt-2 font-serif text-2xl">Current month</h2></div>
          <div className="mt-5 grid gap-3">
            {transactions.length ? transactions.map((transaction) => <section className="rounded-xl bg-white/35 backdrop-blur-xl p-4" key={transaction.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#16231e]">{transaction.description}</p>
                  <p className="mt-1 text-xs text-[#64726b]">{transaction.transaction_date} · {categoryName(categories, transaction.category_id)} · {transaction.normalized_merchant || "No merchant"}</p>
                </div>
                <p className={transaction.transaction_type === "income" ? "font-bold text-[#163c30]" : "font-bold text-[#8a2f20]"}>{transaction.transaction_type === "income" ? "+" : transaction.transaction_type === "expense" ? "-" : ""}{formatCurrency(parseMoneyToCents(transaction.amount))}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button className={secondaryButton} onClick={() => setEditing(transaction)} type="button">Edit</button>
                <button className={secondaryButton} disabled={pendingId === transaction.id} onClick={() => deleteTransaction(transaction.id)} type="button">Delete</button>
              </div>
            </section>) : <p className="rounded-xl bg-white/35 backdrop-blur-xl p-4 text-sm text-[#64726b]">No transactions for {month} yet.</p>}
          </div>
        </article>
      </div>
    </section>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-[#dce4dd]/70 bg-white/70 backdrop-blur-xl p-5">
    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">{label}</p>
    <p className="mt-2 text-2xl font-black text-[#16231e]">{value}</p>
  </article>;
}
