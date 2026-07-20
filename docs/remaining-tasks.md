# Remaining Tasks

The core app is now wired as a usable Supabase-backed Execution OS: migrations use Supabase CLI, runtime data access uses the Supabase service-role client, and the dashboard reads/writes live data.

## Required before production deploy

- [ ] Set `SUPABASE_URL` in Vercel.
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel as a server-only secret.
- [ ] Set `APP_PASSWORD_HASH` in Vercel.
- [ ] Set `SESSION_SECRET` in Vercel.
- [ ] Set `ANTHROPIC_API_KEY` in Vercel if AI planning should work in production.
- [ ] Run `npm run db:migrate` after creating new Supabase migrations.
- [ ] Confirm the deployed dashboard can load, bootstrap, create opportunities, update tasks, create drafts, and approve drafts.

## Product follow-ups

- [ ] Add manual create/edit forms for goals.
- [ ] Add manual create/edit forms for initiatives.
- [ ] Add manual create/edit forms for projects.
- [ ] Add manual create/edit forms for milestones.
- [ ] Add manual create/edit forms for weekly priorities.
- [ ] Add manual task creation and editing.
- [ ] Add opportunity review actions: accept, defer, archive, or convert into project/task.
- [ ] Add a logout button.
- [ ] Add tests for bootstrap, task updates, opportunities, planning drafts, and approval.

## Roadmap, not required for current app usability

- [ ] Implement Notion sync if the Guidance Layer remains in scope.
- [ ] Implement `/api/guidance` retrieval if Cursor/browser guidance remains in scope.
- [ ] Implement MCP guidance integration if still desired.
- [ ] Implement Chrome extension context injection if still desired.
- [ ] Add pgvector and embeddings after metadata-based guidance retrieval exists.