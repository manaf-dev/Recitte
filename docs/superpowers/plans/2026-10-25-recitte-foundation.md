# Recitte Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an empty `main` from the design (not from `prototype`), scaffold the pnpm monorepo, ship the shared TypeScript helpers, and land Supabase schema, RLS, storage, and staff invite/remove Edge Functions.

**Architecture:** Orphan `main` holds only the approved design first, then a pnpm workspace with `packages/shared`, `apps/web` (stub), `apps/admin` (stub), and `supabase/`. Postgres + RLS are the access boundary. Staff invites go through a service-role Edge Function that only a `super_admin` may call.

**Tech Stack:** pnpm workspaces, TypeScript, Vitest, Supabase CLI (Postgres, Auth, Storage, Edge Functions), Vue/Nuxt stubs only (no real UI in this plan).

**Spec:** `docs/superpowers/specs/2026-10-25-recitte-site-design.md`

**Follow-on plans:** `2026-10-25-recitte-public-site.md`, then `2026-10-25-recitte-admin-and-email.md`. Do not start those until this plan’s final commit is on `main`.

## Global Constraints

- `main` must not contain files from branch `prototype` (no `index.html`, `support.js`, or prototype `assets/` as the app source).
- Dates and “past” use timezone `Africa/Accra`.
- Public sign-up disabled; magic-link only.
- Service role key never ships to browser apps.
- Invited users get role `staff` only; `super_admin` is set in the dashboard.
- Seed: settings headline/intro from prototype, email `salman@recitte.org`, WhatsApp `+233 54 063 4141`; phone/community/social URLs empty and socials hidden; no programs or testimonials.

## Review Focus

- Anonymous `select` on `applications` / `registrations` / `contacts` must fail; only `insert` with `status = new` succeeds.
- Inserting an application or registration for a past program must fail at the database.
- Non–super-admin calling invite or remove-staff must be rejected.
- `isProgramPast` with only `starts_on` yesterday in Accra must be true; with no dates, false.
- Staff member cannot delete their own `staff` row via the remove function when they are `super_admin` (self-remove blocked).

---

### Task 1: Orphan `main` with the design only

**Files:**
- Create on `main`: `docs/superpowers/specs/2026-10-25-recitte-site-design.md` (copy from current working tree)
- Create on `main`: `docs/superpowers/plans/2026-10-25-recitte-foundation.md` (this file)
- Create on `main`: `docs/superpowers/plans/2026-10-25-recitte-public-site.md`
- Create on `main`: `docs/superpowers/plans/2026-10-25-recitte-admin-and-email.md`
- Create on `main`: `.gitignore` (Node/pnpm/Supabase/Vercel defaults; ignore `.env*`, `node_modules`, `.nuxt`, `dist`, `.output`)
- Create on `main`: `README.md` (one paragraph: Recitte monorepo; point to the design; note `prototype` is reference only)

**Interfaces:**
- Consumes: nothing
- Produces: branch `main` with no prototype app files

- [ ] **Step 1: Ensure the three plan files and the design exist on the current branch (working tree)**

Confirm paths under `docs/superpowers/`. If public-site or admin plans are missing, write them before creating `main` (Tasks in those files may be stubs until written in the same session).

- [ ] **Step 2: Create orphan `main` and commit only docs + gitignore + README**

```bash
git fetch origin
git checkout --orphan main
git rm -rf --cached .
# stage only: docs/, .gitignore, README.md
git add docs .gitignore README.md
git commit -m "$(cat <<'EOF'
docs: start main with Recitte design and plans

Empty of the Claude prototype; feature work branches from here.
EOF
)"
```

- [ ] **Step 3: Verify**

Run: `git ls-files`  
Expected: only paths under `docs/`, plus `.gitignore` and `README.md`. No `index.html`, `support.js`, or `ProgramCardV2.dc.html`.

- [ ] **Step 4: Push `main` (only if user asked to push; otherwise stop after local commit)**

If pushing: `git push -u origin main` with user approval. Do not delete or rewrite `prototype`.

---

### Task 2: pnpm workspace scaffold

**Files:**
- Create: `package.json` (private root, scripts: `test`, `lint` placeholders)
- Create: `pnpm-workspace.yaml` with `apps/*`, `packages/*`
- Create: `packages/shared/package.json` name `@recitte/shared`
- Create: `packages/shared/tsconfig.json`, `packages/shared/src/index.ts` (empty export)
- Create: `apps/web/package.json` (Nuxt stub: name `@recitte/web`, dependency on `@recitte/shared`)
- Create: `apps/admin/package.json` (Vite Vue stub: name `@recitte/admin`, dependency on `@recitte/shared`)
- Create: `apps/web/nuxt.config.ts` minimal, `apps/web/app.vue` with “Recitte” text
- Create: `apps/admin/vite.config.ts`, `apps/admin/index.html`, `apps/admin/src/main.ts`, `apps/admin/src/App.vue` with “Recitte Admin” text
- Modify: `README.md` with `pnpm install` and workspace layout

**Interfaces:**
- Consumes: Task 1 `main`
- Produces: `@recitte/shared`, `@recitte/web`, `@recitte/admin` installable via pnpm

- [ ] **Step 1: Scaffold packages and apps as above (Nuxt + Vite Vue + Tailwind deps may be added here or in follow-on plans; at minimum TypeScript builds)**

- [ ] **Step 2: Install**

Run: `pnpm install`  
Expected: lockfile written; no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml packages apps README.md
git commit -m "chore: scaffold pnpm monorepo with web and admin stubs"
```

---

### Task 3: Shared program helpers and validators

**Files:**
- Create: `packages/shared/src/types.ts` — types matching the design (`Program`, `ProgramType`, `ProgramStatus`, `RegistrationKind`, `SubmissionStatus`, `StaffRole`, `Settings`, `Testimonial`, form payloads)
- Create: `packages/shared/src/dates.ts` — `isProgramPast(program: { starts_on: string | null; ends_on: string | null }, today?: string): boolean`
- Create: `packages/shared/src/slug.ts` — `suggestSlug(title: string): string`
- Create: `packages/shared/src/cta.ts` — `programCta(program: ProgramLike): { label: string; action: 'interest' | 'apply' | 'register' | 'notify' | 'join' | 'ended' | 'closed' }`
- Create: `packages/shared/src/validation.ts` — `validateApplication`, `validateRegistration`, `validateContact`, `validateTestimonial` returning `{ ok: true } | { ok: false; errors: Record<string, string> }`
- Create: `packages/shared/src/whatsapp.ts` — `interestMessage(title: string, formattedDate: string | null): string`, `waMeUrl(whatsapp: string, text: string): string`
- Create: `packages/shared/src/index.ts` re-exports
- Test: `packages/shared/src/dates.test.ts`, `cta.test.ts`, `validation.test.ts`, `slug.test.ts`, `whatsapp.test.ts`
- Modify: `packages/shared/package.json` — `"test": "vitest run"`, vitest dep

**Interfaces:**
- Consumes: design past-date / CTA / validation rules
- Produces: exact helpers above for web and admin

- [ ] **Step 1: Write failing tests**

`isProgramPast`: Accra yesterday `starts_on` only → true; future `ends_on` → false; both null → false; `ends_on` yesterday with future `starts_on` → true (ends wins).

`programCta`: past → `ended` / “Registration has ended”; `closed` not past → `closed`; `soon` not past → `notify` / “Notify me”; `open` + `workshop` → `interest`; `open` + `course` → `apply`; `open` + `community` → `join`; `open` + `event` → `register`.

`validateApplication`: missing name/email/phone/country/program/level fail; age 3 fails; age empty ok.

`suggestSlug("Recitte Huruf Workshop")` → `recitte-huruf-workshop`.

`interestMessage` with date includes parenthetical; without date omits it.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter @recitte/shared test`

- [ ] **Step 3: Implement helpers to match tests and design tables**

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add program past, CTA, slug, and form validators"
```

---

### Task 4: Supabase schema, RLS, storage, seed

**Files:**
- Create: `supabase/config.toml` (init via CLI if needed)
- Create: `supabase/migrations/YYYYMMDDHHMMSS_init.sql` — tables `programs`, `testimonials`, `settings`, `social_links`, `applications`, `registrations`, `contacts`, `staff`; enums or check constraints for types/statuses/kinds/roles; unique `programs.slug`; check `ends_on >= starts_on` when both set; reject inserts on applications/registrations when referenced program is past (trigger or check via function using Accra “today”)
- Create: policies per design (anon read content; anon insert submissions with `status = new` only; staff read/write content + submissions; staff table readable/writable only by `super_admin` via `is_super_admin()` helper reading `staff.role`)
- Create: storage bucket `speaker-photos` public read, staff write
- Create: `supabase/seed.sql` — one `settings` row and seven `social_links` rows per design
- Create: `supabase/tests/rls.test.ts` or `supabase/tests/rls.sql` — automated checks for Review Focus RLS cases (prefer pgTAP or a small Vitest script using service + anon clients)

**Interfaces:**
- Consumes: Task 3 types (column names should match shared types: snake_case in DB)
- Produces: migratable schema; `is_staff()`, `is_super_admin()` SQL functions

- [ ] **Step 1: Write the RLS test cases as failing assertions** (anon cannot select applications; anon insert application ok; staff insert past-program registration fails; anon cannot update settings)

- [ ] **Step 2: Run local Supabase and tests — expect FAIL**

Run: `npx supabase start` then the RLS test command documented in README

- [ ] **Step 3: Author migration + seed until tests pass**

- [ ] **Step 4: Commit**

```bash
git add supabase README.md
git commit -m "feat(supabase): schema, RLS, storage, and seed settings"
```

---

### Task 5: Staff invite and remove Edge Functions

**Files:**
- Create: `supabase/functions/invite-staff/index.ts` — verify JWT; require `is_super_admin`; body `{ email: string }`; `auth.admin.inviteUserByEmail` with redirect to admin origin; upsert `staff` row role `staff`
- Create: `supabase/functions/remove-staff/index.ts` — verify JWT; require `is_super_admin`; body `{ user_id: string }`; reject if `user_id` is caller; delete `staff` row and ban/delete auth user as appropriate
- Create: `supabase/functions/_shared/cors.ts`, `supabase/functions/_shared/supabase.ts`
- Test: `supabase/functions/invite-staff/invite-staff.test.ts` (or Deno tests) — staff JWT → 403; super_admin → 200 path mocked; self-remove → 400

**Interfaces:**
- Consumes: `staff` table, service role
- Produces: HTTP endpoints `invite-staff`, `remove-staff`

- [ ] **Step 1: Write failing authz tests**

- [ ] **Step 2: Implement functions**

- [ ] **Step 3: Tests pass**

- [ ] **Step 4: Commit**

```bash
git add supabase/functions
git commit -m "feat(auth): edge functions for staff invite and remove"
```

---

### Task 6: Wire env samples and stop condition

**Files:**
- Create: `.env.example` at root listing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_URL`, `PUBLIC_SITE_URL`, `RESEND_API_KEY`, `RESEND_FROM` (email keys unused until admin-and-email plan)
- Modify: `README.md` — local workflow: `pnpm install`, `supabase start`, link super admin creation steps (create user in Studio, insert `staff` role `super_admin`)

**Interfaces:**
- Consumes: Tasks 1–5
- Produces: documented bootstrap for public-site and admin plans

- [ ] **Step 1: Add env example and README bootstrap section**

- [ ] **Step 2: Commit**

```bash
git add .env.example README.md
git commit -m "docs: local Supabase bootstrap and env example"
```

- [ ] **Step 3: Hand off**

Foundation is done when: orphan `main` has no prototype files; shared tests pass; RLS tests pass; invite/remove authz tests pass. Next plan: `docs/superpowers/plans/2026-10-25-recitte-public-site.md`.
