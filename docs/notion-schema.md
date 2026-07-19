# Notion Schema — Guidance Layer

This schema turns Notion into the **source of truth** for your personal decision guidance system. Create one hub page called **Guidance OS** and link the databases below.

## Hub page structure

```
Guidance OS (page)
├── North Star (linked database)
├── Principles (linked database)
├── Projects (linked database)
├── Decision Frameworks (linked database)
└── Guidance Corpus (linked database)  ← optional catch-all / archive
```

---

## 1. North Star

Long-horizon direction: 5-year plan, career vision, life priorities.

| Property | Notion type | Required | Notes |
|----------|-------------|----------|-------|
| **Name** | Title | Yes | e.g. "5-Year Career Vision 2026–2031" |
| **Status** | Select | Yes | `Active`, `Draft`, `Archived` |
| **Horizon** | Select | Yes | `1 year`, `3 years`, `5 years`, `10 years` |
| **Priority** | Number | Yes | Lower = more important when retrieving (1 = highest) |
| **Summary** | Text | Yes | 2–3 sentences — injected first in career mode |
| **Non-negotiables** | Text | Yes | Bullet list of lines you will not cross |
| **Current focus** | Text | No | What you're optimizing for *this year* |
| **Last reviewed** | Date | Yes | Reminder to re-read when stale |
| **Tags** | Multi-select | No | `career`, `life`, `financial`, `health` |
| **Starred** | Checkbox | No | Always include in career/partnership retrieval |
| **Related projects** | Relation → Projects | No | |
| **Related principles** | Relation → Principles | No | |

### Example entries

| Name | Horizon | Summary |
|------|---------|---------|
| 5-Year Career Vision | 5 years | Build expertise in X, reach Y income, own products not just services. |
| 2026 Annual Focus | 1 year | Ship one revenue product, deepen partnership network in domain Z. |

---

## 2. Principles

Short, emotional anchors — keep each page **under 300 words**.

| Property | Notion type | Required | Notes |
|----------|-------------|----------|-------|
| **Name** | Title | Yes | e.g. "Don't say yes from FOMO" |
| **Status** | Select | Yes | `Active`, `Draft`, `Archived` |
| **Category** | Select | Yes | `Career`, `Partnerships`, `Projects`, `Health`, `Relationships`, `General` |
| **Principle** | Text | Yes | One sentence — the rule |
| **Why it matters** | Text | Yes | Personal reason — read when demotivated |
| **When to apply** | Text | No | Triggers, e.g. "Before accepting any partnership" |
| **Priority** | Number | Yes | 1 = always inject in relevant modes |
| **Starred** | Checkbox | No | Force-include in all decision modes |
| **Tags** | Multi-select | No | |
| **Related frameworks** | Relation → Decision Frameworks | No | |

### Example entries

| Name | Category | Principle |
|------|----------|-----------|
| FOMO filter | Partnerships | I only partner when it advances my 5-year direction, not when I'm afraid of missing out. |
| Finish before starting | Projects | I do not start a new side project until the current one is shipped or explicitly killed. |

---

## 3. Projects

Active and paused work — each project needs a **why**, not just a task list.

| Property | Notion type | Required | Notes |
|----------|-------------|----------|-------|
| **Name** | Title | Yes | Project name |
| **Status** | Select | Yes | `Active`, `Paused`, `Idea`, `Shipped`, `Killed` |
| **Why I'm doing this** | Text | Yes | Core motivation — key for `motivation` mode |
| **Success looks like** | Text | Yes | Concrete outcome |
| **Kill criteria** | Text | Yes | When to stop — prevents sunk-cost decisions |
| **Fits north star because** | Text | Yes | Explicit link to long-term plan |
| **Priority** | Number | Yes | 1 = highest |
| **Starred** | Checkbox | No | |
| **Tags** | Multi-select | No | `side-project`, `client`, `open-source` |
| **North star** | Relation → North Star | No | |
| **Related principles** | Relation → Principles | No | |
| **Last reviewed** | Date | No | |

### Example entries

| Name | Status | Why I'm doing this |
|------|--------|-------------------|
| Guidance Layer app | Active | Gives me a decision system so I stop making emotional career pivots. |
| Client SaaS rebuild | Active | Funds runway while I build owned products. |

---

## 4. Decision Frameworks

Checklists and templates the AI runs against your docs.

| Property | Notion type | Required | Notes |
|----------|-------------|----------|-------|
| **Name** | Title | Yes | e.g. "Partnership Evaluation" |
| **Status** | Select | Yes | `Active`, `Draft`, `Archived` |
| **Mode** | Select | Yes | `career`, `project`, `partnership`, `motivation` |
| **Framework** | Text | Yes | Markdown checklist the AI follows |
| **Priority** | Number | Yes | |
| **Starred** | Checkbox | No | |
| **Tags** | Multi-select | No | |
| **Related principles** | Relation → Principles | No | |

### Example: Partnership Evaluation framework body

```markdown
## Partnership checklist
1. Does this advance my active North Star doc? (cite which one)
2. Does it violate any starred Principle?
3. What is the opportunity cost vs my #1 active Project?
4. Am I saying yes from FOMO, loneliness, or strategy?
5. What would I advise a friend in my position?

## Output format
- Verdict: Proceed / Pause / Decline
- Alignment score: 1–10
- Contradictions with my own docs (quote them)
- Recommended next step
```

---

## 5. Guidance Corpus (optional)

Catch-all for articles, notes, and exports that don't fit other DBs. Sync still works if you only use the four core DBs.

| Property | Notion type | Required | Notes |
|----------|-------------|----------|-------|
| **Name** | Title | Yes | |
| **Type** | Select | Yes | `Note`, `Article`, `Meeting`, `Research`, `Other` |
| **Status** | Select | Yes | `Active`, `Archived` |
| **Content summary** | Text | Yes | Your summary — not raw paste |
| **Modes** | Multi-select | Yes | Which retrieval modes may use this: `career`, `project`, `partnership`, `motivation` |
| **Priority** | Number | Yes | |
| **Starred** | Checkbox | No | |
| **Tags** | Multi-select | No | |
| **Source URL** | URL | No | |

---

## Internal mapping (app ↔ Notion)

The sync layer maps each database to a `GuidanceDocumentType`:

| Notion database | App type constant |
|-----------------|-------------------|
| North Star | `north_star` |
| Principles | `principle` |
| Projects | `project` |
| Decision Frameworks | `framework` |
| Guidance Corpus | `corpus` |

### Shared properties (all databases)

These are read uniformly during sync:

- `Name` → `title`
- `Status` → skip if `Archived` (configurable)
- `Priority`, `Starred`, `Tags` → metadata for retrieval ranking
- Page body blocks → `content` (markdown)

---

## Setup checklist

1. Duplicate or create the five databases with the properties above.
2. Add at least one **Active** North Star, three **Active** Principles, and one **Partnership** framework.
3. Share each database with your Notion integration (Settings → Connections → your integration).
4. Copy database IDs into `.env` (see README).
5. Run sync from the dashboard or `POST /api/notion/sync`.

---

## Retrieval priority by decision mode

| Mode | Always pull | Then pull |
|------|-------------|-----------|
| **career** | Starred principles, Active North Star | Frameworks where `Mode = career`, tagged corpus |
| **project** | Starred + Active projects | Related principles, project frameworks |
| **partnership** | Partnership frameworks, starred principles | North Star, active projects (opportunity cost) |
| **motivation** | Active project "Why" fields | Starred principles, North Star summary |

Starred items and `Priority = 1` documents are injected first; lower-priority content fills remaining token budget.
