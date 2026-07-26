"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ChatMessage = { role: "user" | "assistant"; content: string };
type PendingAction = { id: string; action_type: string; summary: string; status: string };

const inputClass = "rounded-lg border border-[#cad5cb] bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#163c30] focus:ring-2 focus:ring-[#d8ef61]";
const primaryButton = "rounded-lg bg-[#163c30] px-4 py-3 text-sm font-bold text-white disabled:opacity-60";
const secondaryButton = "rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30] disabled:opacity-60";

async function parseJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Request failed.");
  return body;
}

export function FinanceAssistant() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Ask about your current month, category spend, remaining money, or ask me to propose a transaction or budget change for confirmation." },
  ]);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [pendingActionId, setPendingActionId] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const content = data.get("message")?.toString().trim();
    if (!content) return;
    const nextMessages = [...messages, { role: "user" as const, content }].slice(-12);
    setMessages(nextMessages);
    setError("");
    form.reset();
    startTransition(async () => {
      try {
        const result = await parseJson(await fetch("/api/finance/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages }),
        })) as { message: string; actions: PendingAction[] };
        setMessages((current) => [...current, { role: "assistant" as const, content: result.message }].slice(-12));
        if (result.actions?.length) setActions((current) => [...result.actions, ...current].slice(0, 8));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Assistant failed.");
      }
    });
  }

  function resolveAction(actionId: string, decision: "confirm" | "reject") {
    setPendingActionId(actionId);
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch("/api/finance/assistant/actions/" + actionId + "/" + decision, { method: "POST" }));
        setActions((current) => current.filter((action) => action.id !== actionId));
        setMessages((current) => [...current, { role: "assistant" as const, content: decision === "confirm" ? "Confirmed. I updated the finance records." : "Rejected. I left the finance records unchanged." }].slice(-12));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not update action.");
      } finally {
        setPendingActionId("");
      }
    });
  }

  return <article className="scroll-mt-28 rounded-2xl border border-[#dce4dd] bg-white p-6" id="finance-assistant">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">AI assistant</p>
        <h2 className="mt-2 font-serif text-2xl">Finance chat</h2>
      </div>
      <span className="rounded-lg bg-[#f5f7f2] px-3 py-2 text-xs font-bold text-[#163c30]">ZAR only</span>
    </div>

    <div className="mt-5 grid max-h-[360px] gap-3 overflow-y-auto pr-1">
      {messages.map((message, index) => <section className={message.role === "assistant" ? "rounded-xl bg-[#f5f7f2] p-4" : "rounded-xl bg-[#163c30] p-4 text-white"} key={index}>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
      </section>)}
    </div>

    {actions.length ? <div className="mt-5 grid gap-3">
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#64726b]">Pending confirmations</p>
      {actions.map((action) => <section className="rounded-xl border border-[#cad5cb] bg-[#fbfcf8] p-4" key={action.id}>
        <p className="text-sm font-bold text-[#16231e]">{action.summary}</p>
        <p className="mt-1 text-xs text-[#64726b]">No data changes until you confirm.</p>
        <div className="mt-3 flex gap-2">
          <button className={primaryButton} disabled={pendingActionId === action.id} onClick={() => resolveAction(action.id, "confirm")} type="button">Confirm</button>
          <button className={secondaryButton} disabled={pendingActionId === action.id} onClick={() => resolveAction(action.id, "reject")} type="button">Reject</button>
        </div>
      </section>)}
    </div> : null}

    <form className="mt-5 grid gap-3" onSubmit={submit}>
      <textarea className={inputClass + " min-h-24"} name="message" placeholder="Where do I stand this month? Or: Add R300 Uber as transport today." required />
      <button className={primaryButton} disabled={pending} type="submit">{pending ? "Thinking..." : "Send"}</button>
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
    </form>
  </article>;
}
