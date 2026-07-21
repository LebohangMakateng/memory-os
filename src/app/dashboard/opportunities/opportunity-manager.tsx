"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Opportunity = {
  id: string;
  title: string;
  note: string | null;
  status: string;
};

type Initiative = { id: string; title: string };

async function parseJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : "Request failed.";
    throw new Error(message);
  }
  return body;
}

export function OpportunityManager({ initiatives, opportunities }: { initiatives: Initiative[]; opportunities: Opportunity[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState("");
  const [convertingId, setConvertingId] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function updateOpportunity(opportunityId: string, body: Record<string, unknown>, done?: () => void) {
    setError("");
    setPendingId(opportunityId);
    startTransition(async () => {
      try {
        await parseJson(await fetch(`/api/execution/opportunities/${opportunityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }));
        done?.();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not update opportunity.");
      } finally {
        setPendingId("");
      }
    });
  }

  function archiveOpportunity(opportunityId: string) {
    setError("");
    setPendingId(opportunityId);
    startTransition(async () => {
      try {
        await parseJson(await fetch(`/api/execution/opportunities/${opportunityId}`, { method: "DELETE" }));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not archive opportunity.");
      } finally {
        setPendingId("");
      }
    });
  }

  function convertOpportunity(event: FormEvent<HTMLFormElement>, opportunity: Opportunity) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setPendingId(opportunity.id);
    startTransition(async () => {
      try {
        await parseJson(await fetch("/api/execution/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            initiativeId: data.get("initiativeId")?.toString() ?? "",
            title: data.get("title")?.toString().trim() || opportunity.title,
            purpose: data.get("purpose")?.toString().trim() || opportunity.note || opportunity.title,
            status: "active",
            shareStatus: "planned",
          }),
        }));
        await parseJson(await fetch("/api/execution/opportunities/" + opportunity.id, { method: "DELETE" }));
        setConvertingId("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not convert opportunity.");
      } finally {
        setPendingId("");
      }
    });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>, opportunityId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    updateOpportunity(opportunityId, {
      title: data.get("title")?.toString() ?? "",
      note: data.get("note")?.toString() || null,
    }, () => setEditingId(""));
  }

  if (!opportunities.length) return <p className="mt-5 text-sm text-[#64726b]">No inbox items.</p>;

  return <div className="mt-5 grid gap-3">
    {opportunities.map((opportunity) => <div className="rounded-lg bg-[#f5f7f2] p-4" key={opportunity.id}>
      {editingId === opportunity.id ? <form className="grid gap-3" onSubmit={(event) => submitEdit(event, opportunity.id)}>
        <input className="rounded-lg border border-[#cad5cb] bg-white px-3 py-2 text-sm" defaultValue={opportunity.title} name="title" required />
        <textarea className="min-h-20 rounded-lg border border-[#cad5cb] bg-white px-3 py-2 text-sm" defaultValue={opportunity.note ?? ""} name="note" />
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-[#163c30] px-3 py-2 text-xs font-bold text-white disabled:opacity-60" disabled={pendingId === opportunity.id} type="submit">
            {pendingId === opportunity.id ? "Saving..." : "Save"}
          </button>
          <button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30]" onClick={() => setEditingId("")} type="button">Cancel</button>
        </div>
      </form> : convertingId === opportunity.id ? <form className="grid gap-3" onSubmit={(event) => convertOpportunity(event, opportunity)}>
        <select className="rounded-lg border border-[#cad5cb] bg-white px-3 py-2 text-sm" name="initiativeId" required>
          <option value="">Choose initiative</option>
          {initiatives.map((initiative) => <option key={initiative.id} value={initiative.id}>{initiative.title}</option>)}
        </select>
        <input className="rounded-lg border border-[#cad5cb] bg-white px-3 py-2 text-sm" defaultValue={opportunity.title} name="title" required />
        <textarea className="min-h-20 rounded-lg border border-[#cad5cb] bg-white px-3 py-2 text-sm" defaultValue={opportunity.note ?? opportunity.title} name="purpose" required />
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-[#163c30] px-3 py-2 text-xs font-bold text-white disabled:opacity-60" disabled={pendingId === opportunity.id || !initiatives.length} type="submit">{pendingId === opportunity.id ? "Converting..." : "Create project"}</button>
          <button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30]" onClick={() => setConvertingId("")} type="button">Cancel</button>
        </div>
        {!initiatives.length ? <p className="text-xs text-[#64726b]">Create an initiative before converting opportunities.</p> : null}
      </form> : <>
        <p className="text-sm font-bold">{opportunity.title}</p>
        {opportunity.note ? <p className="mt-1 text-xs leading-5 text-[#64726b]">{opportunity.note}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30]" onClick={() => setEditingId(opportunity.id)} type="button">Edit</button>
          <button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30]" onClick={() => setConvertingId(opportunity.id)} type="button">Convert</button>
          <button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30] disabled:opacity-60" disabled={pendingId === opportunity.id} onClick={() => updateOpportunity(opportunity.id, { status: "reviewed" })} type="button">Mark reviewed</button>
          <button className="rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30] disabled:opacity-60" disabled={pendingId === opportunity.id} onClick={() => updateOpportunity(opportunity.id, { status: "deferred" })} type="button">Defer</button>
          <button className="rounded-lg border border-[#d7c0bb] px-3 py-2 text-xs font-bold text-[#8f2f1f] disabled:opacity-60" disabled={pendingId === opportunity.id} onClick={() => archiveOpportunity(opportunity.id)} type="button">Archive</button>
        </div>
      </>}
    </div>)}
    {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
  </div>;
}
