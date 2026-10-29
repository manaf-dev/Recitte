# Recitte Admin and Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Vite admin on its own origin (magic-link auth, content CMS, inboxes, Staff for super admins) and Resend-backed submission notification emails that never block queue success.

**Architecture:** `apps/admin` is a Vue 3 + Vue Router + Tailwind SPA. Auth session via Supabase magic link. Data through anon key + RLS. Invite/remove call foundation Edge Functions. A `notify-submission` Edge Function listens to inserts (Database Webhook or trigger → function) and sends staff + visitor mail when Resend is configured.

**Tech Stack:** Vite, Vue 3 Composition API, Vue Router, Tailwind, `@supabase/supabase-js`, `@recitte/shared`, Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-25-recitte-site-design.md`  
**Depends on:** foundation plan complete; public-site plan ideally merged first (shared types stable), but admin can proceed once foundation RLS and invite functions exist.

## Global Constraints

- Noindex admin (`<meta name="robots" content="noindex">`).
- No public sign-up UI; no password field.
- Staff section visible only when `staff.role === 'super_admin'`.
- Invites use Supabase Auth email (works without Resend).
- Submission emails use Resend; missing key → log and keep row; UI never says email was sent.
- Service role only inside Edge Functions.

## Review Focus

- Logged-out user hitting `/programs` redirects to login.
- Non–super-admin navigation never shows Staff; direct `/staff` redirects away.
- Invite from staff JWT fails (function 403).
- Marking a submission handled ↔ new works; delete requires confirm and removes row.
- With Resend unset, inserting a contact still succeeds and function exits cleanly.

---

### Task 1: Branch, Vite admin shell, auth

**Files:**
- Branch: `feature/admin` from `main`
- Modify: `apps/admin` — Tailwind, Router, Supabase client
- Create: `apps/admin/src/pages/LoginView.vue` — magic-link request; unknown email → “ask the super admin for an invite”
- Create: `apps/admin/src/pages/AuthCallbackView.vue`
- Create: `apps/admin/src/router/index.ts` — auth guard
- Create: `apps/admin/src/composables/useAuth.ts`, `useStaffProfile.ts` (loads `staff` row for current user)
- Create: `apps/admin/index.html` robots noindex

**Interfaces:**
- Consumes: Supabase Auth magic link redirect to `ADMIN_URL`
- Produces: session gate

- [ ] **Step 1: Scaffold routing and login**

- [ ] **Step 2: Guard test or manual script — unauthenticated protected route → login**

- [ ] **Step 3: Commit** — `feat(admin): magic-link login and route guard`

---

### Task 2: Admin chrome and Overview

**Files:**
- Create: `apps/admin/src/layouts/AdminLayout.vue` — tabs: Overview, Programs, Applications, Registrations, Messages, Testimonials, Content & links, Staff (if super_admin)
- Create: `apps/admin/src/pages/OverviewView.vue` — new counts + recent 8
- Create: `apps/admin/src/composables/useOverview.ts`

**Interfaces:**
- Consumes: applications/registrations/contacts/programs reads
- Produces: overview dashboard

- [ ] **Step 1: Implement layout + overview counts (`status = new`)**

- [ ] **Step 2: Commit** — `feat(admin): shell navigation and overview`

---

### Task 3: Programs CMS

**Files:**
- Create: `apps/admin/src/pages/ProgramsView.vue`, `ProgramForm.vue`
- Create: `apps/admin/src/composables/useProgramsAdmin.ts`
- Create: `apps/admin/src/composables/useSpeakerUpload.ts` — Storage `speaker-photos`
- Test: slug suggestion wiring uses `suggestSlug` until dirty

**Interfaces:**
- Consumes: shared slug + types; all program fields from design table
- Produces: CRUD, status cycle, featured toggle, photo upload, delete confirm

- [ ] **Step 1: List + status/feature/delete**

- [ ] **Step 2: Add/edit form including optional about/highlights/bio/extra details**

- [ ] **Step 3: Commit** — `feat(admin): programs CMS`

---

### Task 4: Testimonials and Content & links

**Files:**
- Create: `apps/admin/src/pages/TestimonialsView.vue`, `SettingsView.vue`
- Create: composables for testimonials and settings/socials updates

**Interfaces:**
- Consumes: design settings/social rules
- Produces: editable testimonials; settings without reset control

- [ ] **Step 1: Testimonials add/edit/remove with shared validator**

- [ ] **Step 2: Settings + seven social rows**

- [ ] **Step 3: Commit** — `feat(admin): testimonials and site settings`

---

### Task 5: Inboxes

**Files:**
- Create: `apps/admin/src/pages/ApplicationsView.vue`, `RegistrationsView.vue`, `MessagesView.vue`
- Create: `apps/admin/src/components/SubmissionList.vue` — status toggle new/handled, delete confirm
- Create: `apps/admin/src/composables/useSubmissions.ts`

**Interfaces:**
- Consumes: RLS staff update/delete
- Produces: queue management

- [ ] **Step 1: Shared list component + three pages**

- [ ] **Step 2: Commit** — `feat(admin): applications, registrations, and messages queues`

---

### Task 6: Staff screen

**Files:**
- Create: `apps/admin/src/pages/StaffView.vue`
- Create: `apps/admin/src/composables/useStaffAdmin.ts` — calls `invite-staff` / `remove-staff` functions
- Modify: router — `/staff` only if `super_admin`

**Interfaces:**
- Consumes: foundation Edge Functions
- Produces: invite by email; list; remove others; no self-remove; no promote UI

- [ ] **Step 1: UI + client calls**

- [ ] **Step 2: Guard — staff role cannot open Staff**

- [ ] **Step 3: Commit** — `feat(admin): super-admin staff invite screen`

---

### Task 7: Submission notification emails

**Files:**
- Create: `supabase/functions/notify-submission/index.ts` — payload from insert webhook; load `settings.email`; send staff notice + visitor ack; if no `RESEND_API_KEY` or `RESEND_FROM`, log and return 200
- Create: `supabase/migrations/..._submission_webhook.sql` or document Dashboard webhook to the function (prefer migration-trigger invoking `net.http` only if available; otherwise README steps for Database Webhook)
- Create: email body helpers (subject + text) for application / registration / contact
- Test: function unit test — no Resend key → no throw; with key → Resend called twice for contact

**Interfaces:**
- Consumes: insert row + settings
- Produces: optional email; never rolls back insert

- [ ] **Step 1: Failing tests for skip-when-unconfigured and ack copy windows (3 days apply, 2 days contact)**

- [ ] **Step 2: Implement function + wire trigger/webhook**

- [ ] **Step 3: Commit** — `feat(email): Resend notices for submissions`

---

### Task 8: Deploy notes and handoff

**Files:**
- Modify: `README.md` — two Vercel projects (`apps/web`, `apps/admin`), env vars, create first super admin in Studio, attach domains later
- Create: `apps/admin/.env.example`, document Auth redirect URLs

- [ ] **Step 1: Write deploy section**

- [ ] **Step 2: Commit** — `docs: Vercel and super-admin bootstrap`

- [ ] **Step 3: PR to `main` when user asks**
