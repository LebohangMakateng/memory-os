"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { statusLabel } from "../_components/format";

type Initiative = { id: string; title: string };
type Project = { id: string; initiativeId: string; title: string; purpose: string; status: string; shareStatus: string };
type Milestone = { id: string; projectId: string; title: string; outcome: string };

const inputClass = "rounded-lg border border-[#cad5cb] bg-white px-3 py-2 text-sm";
const labelClass = "grid gap-1 text-xs font-bold text-[#32443a]";
const primaryButton = "rounded-lg bg-[#163c30] px-4 py-2 text-sm font-bold text-white disabled:opacity-60";
const secondaryButton = "rounded-lg border border-[#cad5cb] px-3 py-2 text-xs font-bold text-[#163c30] disabled:opacity-60";

async function parseJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : "Request failed.";
    throw new Error(message);
  }
  return body;
}

function projectPayload(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    initiativeId: data.get("initiativeId")?.toString() ?? "",
    title: data.get("title")?.toString().trim() ?? "",
    purpose: data.get("purpose")?.toString().trim() ?? "",
    status: data.get("status")?.toString() ?? "active",
    shareStatus: data.get("shareStatus")?.toString() ?? "planned",
  };
}

export function ProjectBoard({ initiatives, projects, milestones }: { initiatives: Initiative[]; projects: Project[]; milestones: Milestone[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const milestonesByProject = useMemo(() => new Map(projects.map((project) => [project.id, milestones.filter((milestone) => milestone.projectId === project.id)])), [milestones, projects]);

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch("/api/execution/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectPayload(form)),
        }));
        form.reset();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not create project.");
      }
    });
  }

  function updateProject(event: FormEvent<HTMLFormElement>, projectId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    setPendingId(projectId);
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch(`/api/execution/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectPayload(form)),
        }));
        setEditingId("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not update project.");
      } finally {
        setPendingId("");
      }
    });
  }

  function archiveProject(projectId: string) {
    setPendingId(projectId);
    setError("");
    startTransition(async () => {
      try {
        await parseJson(await fetch(`/api/execution/projects/${projectId}`, { method: "DELETE" }));
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not archive project.");
      } finally {
        setPendingId("");
      }
    });
  }

  return <section className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
    <form className="grid gap-4 rounded-2xl border border-[#dce4dd] bg-white p-7" onSubmit={createProject}>
      <div>
        <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">NEW PROJECT</p>
        <h2 className="mt-2 font-serif text-2xl">Create project</h2>
      </div>
      <label className={labelClass}>
        Initiative
        <select className={inputClass} name="initiativeId" required>
          <option value="">Choose initiative</option>
          {initiatives.map((initiative) => <option key={initiative.id} value={initiative.id}>{initiative.title}</option>)}
        </select>
      </label>
      <label className={labelClass}>
        Title
        <input className={inputClass} name="title" required />
      </label>
      <label className={labelClass}>
        Purpose
        <textarea className={`${inputClass} min-h-24`} name="purpose" required />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Status
          <select className={inputClass} defaultValue="active" name="status">
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label className={labelClass}>
          Share status
          <select className={inputClass} defaultValue="planned" name="shareStatus">
            <option value="planned">Planned</option>
            <option value="drafting">Drafting</option>
            <option value="ready_to_share">Ready to share</option>
            <option value="shared">Shared</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </label>
      </div>
      <button className={primaryButton} disabled={pending || !initiatives.length} type="submit">{pending ? "Saving..." : "Create project"}</button>
      {!initiatives.length ? <p className="text-sm text-[#64726b]">Create an initiative before adding projects.</p> : null}
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
    </form>

    <div className="grid gap-4">
      {projects.length ? projects.map((project) => {
        const projectMilestones = milestonesByProject.get(project.id) ?? [];
        const initiative = initiatives.find((item) => item.id === project.initiativeId);
        return <article className="rounded-2xl border border-[#dce4dd] bg-white p-7" key={project.id}>
          {editingId === project.id ? <form className="grid gap-3" onSubmit={(event) => updateProject(event, project.id)}>
            <label className={labelClass}>Initiative<select className={inputClass} defaultValue={project.initiativeId} name="initiativeId" required>{initiatives.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label className={labelClass}>Title<input className={inputClass} defaultValue={project.title} name="title" required /></label>
            <label className={labelClass}>Purpose<textarea className={`${inputClass} min-h-24`} defaultValue={project.purpose} name="purpose" required /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Status<select className={inputClass} defaultValue={project.status} name="status"><option value="active">Active</option><option value="paused">Paused</option></select></label>
              <label className={labelClass}>Share status<select className={inputClass} defaultValue={project.shareStatus} name="shareStatus"><option value="planned">Planned</option><option value="drafting">Drafting</option><option value="ready_to_share">Ready to share</option><option value="shared">Shared</option><option value="not_applicable">Not applicable</option></select></label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={primaryButton} disabled={pendingId === project.id} type="submit">{pendingId === project.id ? "Saving..." : "Save"}</button>
              <button className={secondaryButton} onClick={() => setEditingId("")} type="button">Cancel</button>
            </div>
          </form> : <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[.14em] text-[#64726b]">{statusLabel(project.shareStatus)}</p>
                <h2 className="mt-2 font-serif text-2xl">{project.title}</h2>
                <p className="mt-1 text-xs font-bold text-[#64726b]">{initiative?.title ?? "No initiative"} / {statusLabel(project.status)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={secondaryButton} onClick={() => setEditingId(project.id)} type="button">Edit</button>
                <button className="rounded-lg border border-[#d7c0bb] px-3 py-2 text-xs font-bold text-[#8f2f1f] disabled:opacity-60" disabled={pendingId === project.id} onClick={() => archiveProject(project.id)} type="button">Archive</button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#64726b]">{project.purpose}</p>
            <div className="mt-5 grid gap-2">
              {projectMilestones.length ? projectMilestones.map((milestone) => <div className="rounded-lg bg-[#f5f7f2] p-3" key={milestone.id}>
                <p className="text-sm font-bold">{milestone.title}</p>
                <p className="mt-1 text-xs text-[#64726b]">{milestone.outcome}</p>
              </div>) : <p className="rounded-lg bg-[#f5f7f2] p-3 text-xs text-[#64726b]">No milestones yet.</p>}
            </div>
          </>}
        </article>;
      }) : <div className="rounded-2xl border border-[#dce4dd] bg-white p-7 text-sm text-[#64726b]">No active projects.</div>}
    </div>
  </section>;
}
