# Recitte Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Nuxt public site that ports the prototype’s pages and forms, reads content from Supabase, and writes applications, registrations, and contact messages under the design’s rules.

**Architecture:** Nuxt 3 app in `apps/web` uses Composition API + Tailwind, pulls programs/testimonials/settings/socials via the anon Supabase client, and uses `@recitte/shared` for past-date, CTA, and validation. Program pages set OG title/description/image. No admin routes.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, Tailwind CSS, `@supabase/supabase-js`, `@recitte/shared`, Vitest (Nuxt/Vue Test Utils where needed).

**Spec:** `docs/superpowers/specs/2026-10-25-recitte-site-design.md`  
**Depends on:** `docs/superpowers/plans/2026-10-25-recitte-foundation.md` complete on `main`.

## Global Constraints

- Copy and section order from `prototype` `index.html`; behavior from the design wins.
- Timezone `Africa/Accra` via shared helpers.
- Success copy never claims email was sent.
- Community QR generated in-browser (e.g. `qrcode` package), not a third-party image URL.
- Hide Join when `community_link` empty; hide WhatsApp CTAs when `whatsapp` empty; hide phone row when phone empty.
- Footer includes CC BY-SA credits from prototype `assets/credits.json` (copy credit strings into the web app; copy image files from `prototype` into `apps/web/public` as needed — do not merge the prototype branch).
- Brand colors/type from prototype CSS variables (`--ground`, `--ink`, `--gold`, `--soft`, `--stone`).

## Review Focus

- Featured home list never includes a past or closed program.
- Past program page shows “Registration has ended” and submit helpers refuse to insert.
- Failed interest save still offers WhatsApp without claiming the interest was stored.
- Application dropdown omits past and closed workshops/courses.
- OG tags on `/programs/:slug` include title and image.

---

### Task 1: Branch, Nuxt + Tailwind + design tokens

**Files:**
- Branch: `feature/public-site` from `main`
- Modify: `apps/web/*` — Nuxt + Tailwind configured
- Create: `apps/web/assets/css/main.css` with prototype CSS variables and base typography (Cormorant Garamond, Manrope, Amiri via `nuxt/fonts` or link tags)
- Create: `apps/web/composables/useSupabaseClient.ts`
- Create: `apps/web/.env.example` with `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY`

**Interfaces:**
- Consumes: foundation stubs
- Produces: runnable Nuxt app with tokens

- [ ] **Step 1: Create branch and finish Nuxt/Tailwind setup**

- [ ] **Step 2: Smoke** — `pnpm --filter @recitte/web dev` serves a page with brand ground color

- [ ] **Step 3: Commit** — `chore(web): configure Nuxt, Tailwind, and brand tokens`

---

### Task 2: Layout, static pages, assets

**Files:**
- Create: `apps/web/layouts/default.vue` — sticky header (Home, About, Connect, Academy, Contact us), footer (explore, get involved, socials, copyright year, photo credits)
- Create: `apps/web/pages/index.vue`, `about.vue`, `connect.vue`, `academy.vue`, `contact.vue` — static sections first; dynamic slots later
- Create: `apps/web/components/` as needed (`SiteHeader`, `SiteFooter`, path cards, level roadmap, etc.)
- Copy images from `prototype` assets into `apps/web/public/images/` (checkout file from `origin/prototype` with `git show`, do not merge branch)
- Create: `apps/web/content/credits.ts` from `assets/credits.json`

**Interfaces:**
- Consumes: prototype copy
- Produces: navigable static shell

- [ ] **Step 1: Port About fully (all static)**

- [ ] **Step 2: Port Connect/Academy static bands (offers, activities, levels) with empty program grids**

- [ ] **Step 3: Port Home static bands + timer stub (real timer in Task 5)**

- [ ] **Step 4: Manual check routes; commit** — `feat(web): port static layout and About/Connect/Academy shell`

---

### Task 3: Data loaders for settings, socials, programs, testimonials

**Files:**
- Create: `apps/web/composables/useSettings.ts`, `usePrograms.ts`, `useTestimonials.ts`
- Create: `apps/web/utils/programQueries.ts` — filters: `featuredForHome`, `forConnect`, `forAcademy`, `relatedPrograms`, `applicationProgramOptions`
- Test: `apps/web/utils/programQueries.test.ts`

**Interfaces:**
- Consumes: `@recitte/shared` `isProgramPast`, Supabase rows
- Produces: typed lists for pages

- [ ] **Step 1: Failing tests for featured/home/connect/academy filters (past/closed rules)**

- [ ] **Step 2: Implement filters + composables**

- [ ] **Step 3: Tests pass; commit** — `feat(web): load settings, programs, and testimonials from Supabase`

---

### Task 4: Program card, listings, program detail + OG

**Files:**
- Create: `apps/web/components/ProgramCard.vue` (port ProgramCardV2 look)
- Create: `apps/web/pages/programs/[slug].vue`
- Modify: home/connect/academy to render cards
- Wire `useSeoMeta` / `useHead` on program page

**Interfaces:**
- Consumes: `programCta` from shared
- Produces: `/programs/:slug` with OG tags

- [ ] **Step 1: Component + listings**

- [ ] **Step 2: Detail page including past → ended CTA, speaker block, related**

- [ ] **Step 3: Commit** — `feat(web): program cards, listings, and detail page`

---

### Task 5: Homepage timer and testimonials marquee

**Files:**
- Create: `apps/web/components/FiveMinuteTimer.vue` — 300s, pause/resume/done/restart; Arabic verse Al-Muzzammil 73:4
- Create: `apps/web/components/TestimonialsMarquee.vue` — omit section if empty; respect `prefers-reduced-motion`
- Test: timer state machine unit test (pure composable `useFiveMinuteTimer`)

**Interfaces:**
- Consumes: none persisted
- Produces: local-only timer

- [ ] **Step 1: Failing timer tests (start → tick → pause → resume → done → restart)**

- [ ] **Step 2: Implement; wire Home**

- [ ] **Step 3: Commit** — `feat(web): five-minute timer and testimonials marquee`

---

### Task 6: Forms — apply, register, contact, interest, join

**Files:**
- Create: `apps/web/components/ApplyDialog.vue`, `RegisterDialog.vue`, `JoinDialog.vue`
- Create: `apps/web/composables/useSubmitApplication.ts`, `useSubmitRegistration.ts`, `useSubmitContact.ts`
- Create: `apps/web/utils/qr.ts` — client QR data URL for community link
- Modify: contact page form
- Test: composable validation wiring (mock Supabase insert success/fail)

**Interfaces:**
- Consumes: shared validators; design CTA table
- Produces: inserts with `status: 'new'`; interest = insert then `window.open(waMeUrl)`; notify = dialog only; join = QR + open link

- [ ] **Step 1: Failing tests — interest failure still exposes WhatsApp action; notify does not open WhatsApp; past program submit not called**

- [ ] **Step 2: Implement dialogs and contact form with prototype success copy (no “email sent” claim)**

- [ ] **Step 3: Commit** — `feat(web): academy apply, registration, contact, interest, and join flows`

---

### Task 7: Public-site polish and handoff

**Files:**
- Modify: header mobile menu; focus styles; empty states for no featured programs
- Modify: `README.md` — how to run web against local Supabase

- [ ] **Step 1: Manual pass against design routes checklist**

- [ ] **Step 2: Commit** — `fix(web): mobile nav and empty states`

- [ ] **Step 3: Open PR to `main` when user asks; next plan is admin-and-email**
