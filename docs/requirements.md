# Requirements — Guidance Layer

**Personal decision guidance system backed by Notion**

*Read this when you forget why you're building this, when a shiny new opportunity tempts you off course, or when you're demotivated on a project and can't remember why it mattered.*

---

## Problem Statement

You already have a second brain — it lives in Notion. Career plans, 5-year vision, side project briefs, guiding principles, partnership notes. The knowledge exists. The system fails at **decision time**.

The failure modes are familiar:

- **Demotivation** — You lose momentum on a project and forget why you started. The "why" doc is in Notion, but opening it feels like work when you're already low energy.
- **Emotional decisions** — Partnership offers, new project ideas, and career pivots feel urgent in the moment. FOMO, loneliness, or excitement replace strategy. You decide from feeling, not from your own written priorities.
- **Forgotten principles** — You wrote "I don't say yes from FOMO" six months ago. You didn't re-read it before saying yes last week.
- **AI without grounding** — When you ask ChatGPT or Claude for advice, they don't know your 5-year plan, your non-negotiables, or your current focus projects. You either paste context manually (and skip it when tired) or get generic advice that ignores your life.

You saw an article about **Unibase Memory** — a Chrome extension that captures AI chats and injects them across ChatGPT, Claude, and Gemini. That resonated for one reason: **the injection UX**. One click, relevant context lands in the chat. But Unibase solves a different problem (cross-tool chat archival). Your source of truth is Notion, and your need is **decision guidance**, not memory of past AI conversations.

**This project exists to make your Notion docs active at the moment you decide — not buried until you remember to open them.**

---

## Goals & Non-Goals

### Goals

1. **Ground decisions in your own writing** — Career moves and project choices should be evaluated against your North Star, principles, and frameworks — with citations to your docs, not generic AI wisdom.
2. **Reduce retrieval friction** — When demotivated or emotional, the system surfaces the right context automatically. You should not have to hunt for the right Notion page.
3. **Inject context into AI** — Whether you're in Cursor building code or in ChatGPT/Claude in the browser, your guidance corpus should be available without manual copy-paste.
4. **Sync across devices** — Your guidance layer follows you. Notion remains where you write; the sync hub runs in the cloud.
5. **Support decision modes** — Different questions need different doc bundles. "Should I take this role?" is not the same retrieval as "Why am I doing this project?"

### Non-Goals

- **Replacing Notion** — Notion stays the editor and source of truth. This system reads and indexes; it does not compete with where you already write.
- **Cross-AI chat archival** — We are not building Unibase Memory. Past AI conversations are not the primary asset.
- **Fully autonomous AI decisions** — The AI advises and checks alignment; you decide. The system flags contradictions with your docs; it does not override you.
- **Multi-user SaaS (Phase 1)** — Initial build is personal, single-user. OAuth and multi-tenant auth are deferred.
- **Real-time Notion sync** — Scheduled or on-demand sync is sufficient. Sub-second live sync is not required.

---

## User Stories / Use Cases

### Career direction (highest priority)

> *As someone considering a job change, freelance pivot, or major skill bet, I want the AI to evaluate the option against my 5-year plan and non-negotiables so I don't make a move I'll regret in six months.*

**Trigger:** "Should I take this role?" / "Is this career direction aligned with where I want to be?"

**Expected behavior:** System pulls Active North Star, starred Principles, and career-mode Decision Frameworks. AI responds with alignment score, contradictions quoted from your docs, and a clear recommendation.

### Project motivation

> *As someone who gets demotivated mid-project, I want to quickly re-read why I started, what success looks like, and when to kill it — without digging through Notion.*

**Trigger:** "Why am I doing this?" / "Should I quit this project?"

**Expected behavior:** Active project's "Why I'm doing this," "Success looks like," and "Kill criteria" fields, plus related principles and North Star link.
### New project decision

> *As someone with too many ideas, I want to evaluate a new project against my finish-before-starting principles and current focus so I don't abandon what's already in flight.*

**Trigger:** "Should I start building Z?" / "Is this idea worth my time?"

**Expected behavior:** Active projects, project-mode frameworks, principles about scope and focus, North Star alignment.

### AI-assisted work (Cursor)

> *As a developer using Cursor, I want to call a guidance tool before asking coding or architecture questions so the AI knows my product priorities and constraints.*

**Trigger:** MCP tool call (`get_guidance`) or implicit context in agent workflows.

### Browser AI (ChatGPT / Claude)

> *As someone who uses ChatGPT and Claude in the browser for strategy and writing, I want to inject my guidance context into the chat input — Unibase-style — without leaving the page.*

**Trigger:** Chrome extension (Phase 3). Select mode → context lands in textarea → edit and send.

---

## Functional Requirements

### Notion integration

| ID | Requirement |
|----|-------------|
| FR-1 | Connect to Notion via integration token (Phase 1) or OAuth (Phase 2). |
| FR-2 | Sync configured databases: North Star, Principles, Projects, Decision Frameworks, optional Guidance Corpus. |
| FR-3 | Map Notion page properties to normalized `guidance_documents` records (title, type, priority, starred, tags, status). |
| FR-4 | Fetch page body blocks and convert to markdown for retrieval and injection. |
| FR-5 | Skip or deprioritize pages with `Status = Archived`. |
| FR-6 | Support manual sync (`POST /api/notion/sync`) and scheduled sync (Vercel Cron). |
| FR-7 | Track sync jobs with audit trail (last run, errors, pages updated). |

### Guidance retrieval

| ID | Requirement |
|----|-------------|
| FR-8 | Expose decision modes: `career`, `project`, `motivation`. |
| FR-9 | Assemble context bundles per mode using metadata ranking (starred → priority → type filter). See [notion-schema.md](./notion-schema.md) retrieval table. |
| FR-10 | Include Decision Frameworks matching the requested mode. |
| FR-11 | Return formatted markdown with source citations (Notion page title + ID). |
| FR-12 | Respect token budget limits; inject highest-priority docs first. |
| FR-13 | Phase 1.5: semantic search via embeddings (pgvector) for query-aware retrieval. |

### API

| ID | Requirement |
|----|-------------|
| FR-14 | `GET/POST /api/guidance` — accept `mode`, optional `query`; return context bundle. |
| FR-15 | All guidance endpoints require Bearer API token authentication. |
| FR-16 | Dashboard UI shows decision modes, sync status, and last sync time. |

### AI integration — Cursor (MCP)

| ID | Requirement |
|----|-------------|
| FR-17 | Local MCP server exposing `get_guidance` (mode + optional query) and `search_guidance`. |
| FR-18 | MCP calls hosted Guidance API over HTTPS with API key. |
| FR-19 | Documented Cursor MCP configuration for one-command setup. |

### AI integration — Browser (Phase 3)

| ID | Requirement |
|----|-------------|
| FR-20 | Chrome extension (Manifest V3) for chatgpt.com, claude.ai, gemini.google.com. |
| FR-21 | User selects decision mode → extension fetches `/api/guidance` → injects markdown into chat textarea. |
| FR-22 | Same API response shape as MCP (shared injection logic). |

### Decision guardrails (Phase 2)

| ID | Requirement |
|----|-------------|
| FR-23 | AI runs structured checklists from Decision Frameworks against retrieved docs. |
| FR-24 | Output includes: verdict (Proceed / Pause / Decline), alignment score, quoted contradictions, recommended next step. |
| FR-25 | Optional decision journaling — log decisions and outcomes for later review. |

---

## Non-Functional Requirements

### Cross-device sync

- Guidance index lives in cloud-hosted Postgres (Supabase), not only on one machine.
- Notion remains editable from any device; sync hub reflects latest synced state.
- MCP runs locally but reads from the same cloud API as the extension.

### Availability & performance

- Guidance API should respond in under 2 seconds for metadata-based retrieval (Phase 1).
- Sync may take minutes for large workspaces; UI shows progress and last successful sync.

### Privacy & security

- Notion integration token stored securely (env var Phase 1; encrypted at rest Phase 2).
- API keys hashed in database; plain key shown once on creation.
- Guidance content is personal and sensitive — no public endpoints without auth.
- CORS restricted to dashboard domain and extension origin.

### Maintainability

- TypeScript throughout.
- Next.js App Router on Vercel for API and dashboard.
- Drizzle ORM for schema migrations.
- Zod for request validation.

### Cost

- Target free/low-cost tier: Vercel hobby, Supabase free tier, Notion free plan sufficient for Phase 1.

---

## Decision Modes

Each mode defines **what context must appear before the AI answers**. Modes are the core product concept — not generic search.

| Mode | When to use | Always include | Then include |
|------|-------------|----------------|--------------|
| **career** | Job changes, skill bets, long-horizon direction | Starred principles, Active North Star | Career frameworks, tagged corpus |
| **project** | Start/stop/continue project decisions | Starred + Active projects | Related principles, project frameworks |
| **motivation** | Demotivation, forgetting why | Active project "Why" fields | Starred principles, North Star summary |

**Ranking rule:** Starred items and `Priority = 1` documents inject first. Lower-priority content fills remaining token budget.

---

## Notion Schema Overview

Notion is the **source of truth** — where you write and maintain your guidance corpus. The app syncs from four core layers (plus an optional fifth):

| Layer | Purpose | Key fields |
|-------|---------|------------|
| **North Star** | 5-year vision, career direction, non-negotiables | Summary, Non-negotiables, Horizon, Current focus |
| **Principles** | Short emotional anchors (< 300 words) | Principle, Why it matters, When to apply, Category |
| **Projects** | Active work with explicit "why" | Why I'm doing this, Success looks like, Kill criteria, Fits north star because |
| **Decision Frameworks** | Checklists the AI runs | Mode, Framework (markdown checklist) |
| **Guidance Corpus** *(optional)* | Articles, notes, research summaries | Modes, Content summary |

All databases live under a **Guidance OS** hub page in Notion.

**Full property definitions, examples, and retrieval mapping:** see [notion-schema.md](./notion-schema.md).

**Architecture and sync pipeline:** see [architecture.md](./architecture.md).

---

## AI Integration Requirements

### Cursor (primary — Phase 1)

- MCP server in `mcp/` runs locally via `npm run mcp`.
- Tools: `get_guidance`, `search_guidance`.
- Environment: `GUIDANCE_API_URL`, `GUIDANCE_API_KEY`.
- User configures once in Cursor MCP settings; thereafter, agents can pull guidance before answering.

**Example workflow:**

1. User asks Cursor: "Should I take this role?"
2. Agent calls `get_guidance({ mode: "career" })`.
3. API returns North Star excerpt, career framework, and starred principles.
4. Agent evaluates the role against retrieved docs and cites contradictions.

### ChatGPT / Claude in browser (Phase 3)

- Chrome extension inspired by Unibase **injection UX**, not its chat archival model.
- User clicks extension → selects mode → context injected into chat input.
- User reviews, edits, sends — same human-in-the-loop as Unibase.
- Supports: chatgpt.com, claude.ai, gemini.google.com.

### Phase 0 (no custom code)

Before the custom tool ships, use **Notion MCP** in Cursor with saved prompts:

> Before answering: search my Notion for Principles, 5-Year Plan, and relevant project docs. Evaluate this decision against them. Flag anything that contradicts my stated priorities.

This validates the workflow before investing in sync infrastructure.

---

## Phased Roadmap

### Phase 0 — This week, no code

- Restructure Notion into the four layers (see [notion-schema.md](./notion-schema.md)).
- Connect Notion MCP to Cursor.
- Write and use reusable decision prompts.
- **Success:** You catch yourself re-reading principles before at least one real decision.

### Phase 1 — Custom sync + retrieval + MCP *(current build)*

- Next.js on Vercel, Supabase Postgres, Notion sync pipeline.
- Metadata-based retrieval by decision mode.
- `/api/guidance` API + MCP server for Cursor.
- Minimal dashboard (modes, sync status).
- **Success:** Cursor agent pulls your North Star and principles automatically when you ask a career question.

### Phase 1.5 — Semantic search

- Chunk documents, embed with OpenAI `text-embedding-3-small`.
- pgvector cosine search for query-aware retrieval.
- **Success:** "Find anything about remote work" returns relevant docs across databases.

### Phase 2 — Decision guardrails + auth

- Structured checklist execution (verdict, alignment score, contradictions).
- User auth (Clerk/NextAuth), encrypted Notion tokens.
- Chrome extension for browser AI injection.
- Optional decision journaling.
- **Success:** A career decision produces a structured Proceed/Pause/Decline with quotes from your own docs.

### Phase 3 — Proactive guidance

- Stale doc reminders ("North Star not reviewed in 90 days").
- Weekly re-read nudges.
- Decision outcome tracking.
- **Success:** System nudges you before you forget, not only when you ask.

---

## Out of Scope / Deferred

| Item | Reason |
|------|--------|
| Unibase Memory as core system | Wrong problem (chat archival vs. Notion decision guidance) |
| Real-time Notion webhooks | Scheduled sync is sufficient for personal use |
| Mobile-native app | Browser + extension + Notion mobile cover use cases |
| Multi-user / team guidance | Personal tool first; SaaS later if ever |
| Automatic AI chat capture | Not the asset; your Notion docs are |
| Decentralized / on-chain storage | Unnecessary complexity for this use case |
| Replacing human judgment | System informs; you decide |

---

## Success Criteria

You'll know this project succeeded when:

1. **You make fewer emotional career decisions** — and when you catch yourself, the system surfaced the relevant principle in time.
2. **You stop abandoning projects without checking kill criteria** — demotivation triggers a motivation-mode pull, not a silent quit.
3. **AI advice references your docs, not platitudes** — responses cite your North Star, your principles, your frameworks.
4. **Context injection takes seconds, not minutes** — no more manual Notion hunting and copy-paste before every AI chat.
5. **You re-read this document less over time** — because the system itself reminds you why you're building what you're building.

### Leading indicators (Phase 1)

- [ ] Notion schema populated with at least 1 North Star, 3 Principles, 1 Career framework
- [ ] Sync runs successfully; dashboard shows last sync time
- [ ] MCP `get_guidance` returns a sensible bundle for each mode
- [ ] One real decision (career or project) evaluated using the system

---

## Open Questions

| Question | Notes |
|----------|-------|
| Auth provider for Phase 2? | Clerk vs NextAuth vs simple API keys only |
| Embedding model and cost ceiling? | OpenAI text-embedding-3-small vs local embeddings |
| How often to sync? | Every 6 hours via cron vs on-demand only |
| Decision journaling format? | Separate Notion DB vs in-app log |
| Extension: inject full bundle or summarized? | Token limits in ChatGPT/Claude inputs |
| Stale doc threshold? | 30 / 60 / 90 days without `Last reviewed` update |
| Single North Star or multiple active? | Schema allows multiple; retrieval needs tie-break rules |

---

## Why This Matters (keep this visible)

You are not building another note-taking app. You are not building Unibase clone #47.

You are building **a system that talks back to you with your own voice** — the voice you had on a good day when you wrote your 5-year plan, your principles, your project whys. The voice that gets drowned out by FOMO, exhaustion, and shiny objects.

Notion holds the knowledge. This project makes it **show up when you need it most**.

When in doubt: ship Phase 1, use it on one real decision, then iterate.

---

*Last updated: July 2026 · Related docs: [notion-schema.md](./notion-schema.md), [architecture.md](./architecture.md)*
