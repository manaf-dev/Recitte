# Recitte

The Recitte monorepo: a public site, a staff admin, and the Supabase backend behind both. The brief is `docs/superpowers/specs/2026-10-25-recitte-site-design.md`; the implementation plans are in `docs/superpowers/plans/`.

## Workspace

```
apps/web/          Nuxt public site (@recitte/web)
apps/admin/        Vite + Vue admin (@recitte/admin)
packages/shared/   types and pure helpers (@recitte/shared)
supabase/          migrations, Edge Functions, database tests
```

Requires Node 22.12+, pnpm 10 (`corepack enable` or `npx pnpm@10`), and Docker for the local Supabase stack.

## Local development

```bash
pnpm install
pnpm db:start        # Supabase CLI local stack; prints URLs and keys
pnpm test            # shared helpers, apps, and Edge Function handlers
pnpm db:test         # pgTAP access-rule tests against the local database
```

`pnpm db:reset` re-applies every migration to a fresh local database.

The settings row and the seven social platform rows are created by a migration, so production gets them too. No programs or testimonials are seeded.

### Public site (`apps/web`)

```bash
cp apps/web/.env.example apps/web/.env   # fill in the URL and PUBLISHABLE_KEY from `pnpm db:start`
pnpm --filter @recitte/web dev           # http://localhost:3000
```

Pages read programs, testimonials, settings and social links with the publishable key and insert applications, registrations and contact messages; Row Level Security does the rest. Program pages render on the server with Open Graph tags, so a link under a flyer previews with the title, date and image. Set `NUXT_PUBLIC_SITE_URL` to the public origin so share links and `og:url` are canonical.

### Create the first super admin

Public sign-up is disabled. The first account is made by hand, locally in Studio (http://127.0.0.1:54323) or in the Supabase dashboard for production:

1. **Authentication → Users → Add user**. Enter the email and a password (at least 8 characters), and tick *Auto confirm*.
2. **SQL editor**, with that user's id:

   ```sql
   insert into public.staff (user_id, email, first_name, last_name, role)
   values ('<auth user id>', '<email>', '<first name>', '<last name>', 'super_admin');
   ```

That person signs in to the admin with that email and password and invites everyone else from the Staff screen, entering each person's first and last name and choosing *Staff* or *Super admin*. No email is sent: the Staff screen shows a one-time invite link to copy and send privately (WhatsApp, for example). It opens the admin's *Set your password* page, verifies only when the person clicks Accept (so chat link previews cannot use it up), and expires after 24 hours (`otp_expiry`). After choosing a password they are sent to the sign-in screen. An unused or expired invite is replaced by removing the person on the Staff screen and inviting them again. Everyone can edit their own first and last name and sign-in email on *Your profile* (account menu); roles are changed by a super admin on the Staff screen (never your own).

### Edge Functions

| Function | Who may call | What it does |
| --- | --- | --- |
| `invite-staff` | super admin | Creates the auth user with an invite link (no email), adds a `staff` row with the chosen role, and returns the link |
| `remove-staff` | super admin | Deletes another staff member's or super admin's auth user (their row goes with it). Cannot remove yourself |
| `change-role` | super admin | Sets another person's role to `staff` or `super_admin`. Cannot change your own role, so at least one super admin always remains |
| `update-email` | any staff | Changes the caller's sign-in email and `staff.email` after checking their current password. No confirmation email is sent |

These functions run with `verify_jwt = false` and verify the caller themselves: `auth.getClaims()` checks the JWT signature, then the live `staff` table decides the role. They talk to the database with the project's default secret key from `SUPABASE_SECRET_KEYS` (injected on hosted projects; the local CLI only injects the legacy key, which is used as a fallback).

The handlers in `supabase/functions/*/handler.ts` take their dependencies as arguments, so `pnpm test:functions` runs them under Vitest without Deno. `index.ts` wires them to the service-role client. They need `ADMIN_URL` as a function secret in production (`supabase secrets set ADMIN_URL=https://admin.example.org`).

### Submission emails

After an application, registration or contact message is saved, a database trigger queues a request (via `pg_net`) to the `notify-submission` Edge Function. It emails the staff address from **Content & links** and sends the visitor a short acknowledgement that repeats the reply window on the form (3 working days for applications, 2 for messages). The row is committed first, so email can never lose a submission:

- Without the Vault secrets below, the trigger does nothing.
- Without `RESEND_API_KEY` and `RESEND_FROM`, the function logs and exits.
- A failed send is logged (`supabase functions logs notify-submission`). The site never says an email was sent.

Wire it up once per environment:

```sql
-- Locally the database reaches functions at http://kong:8000.
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/notify-submission', 'notify_submission_url');
select vault.create_secret('<long random string>', 'notify_submission_secret');
```

```bash
supabase secrets set NOTIFY_WEBHOOK_SECRET='<same random string>' ADMIN_URL=https://admin.example.org
# when the client has a sending domain verified in Resend:
supabase secrets set RESEND_API_KEY=re_... RESEND_FROM='Recitte <hello@recitte.org>'
```

For local runs, put the same keys in `supabase/functions/.env` (git-ignored).

## Deploying

One Supabase project and two Vercel projects from this repository.

### Supabase

```bash
supabase link --project-ref <ref>
supabase db push                 # schema, RLS, storage bucket, settings rows
supabase functions deploy invite-staff remove-staff notify-submission update-email change-role
```

Every table's Data API access is granted explicitly in the migrations (Supabase no longer grants new `public` tables to the API roles automatically), so a fresh project needs nothing extra. `config.toml` sets `auto_expose_new_tables = false` so local runs behave the same.

Then, in the dashboard:

1. **Project Settings → API Keys**: use the publishable (`sb_publishable_…`) and secret (`sb_secret_…`) keys. The legacy `anon`/`service_role` keys are not needed by this repo and can be disabled.
1. **Authentication → Sign In / Providers**: turn off *Allow new users to sign up*. Keep the Email provider on (password sign-in uses it).
1. **Authentication → SMTP Settings** (optional): invites do not use email, but the built-in mailer is what sends any other auth email and only delivers to members of the Supabase organisation, a few an hour. Add a custom SMTP provider (Resend works) once there is a sending domain.
2. **Authentication → URL Configuration**: set *Site URL* to the admin origin (`https://admin.example.org`) and add `https://admin.example.org/**` to *Redirect URLs*. Invite links land on `/auth/set-password` there.
3. Create the first super admin (above).
4. Set the function secrets and Vault entries (above).

### Vercel

| Project | Root directory | Framework | Environment variables |
| --- | --- | --- | --- |
| recitte-web | `apps/web` | Nuxt | `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NUXT_PUBLIC_SITE_URL` |
| recitte-admin | `apps/admin` | Vite | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PUBLIC_SITE_URL` (optional, for the "View site" link) |

Both use the default install command (Vercel detects pnpm from the lockfile) and include files outside the root directory, so the workspace package resolves. Only the publishable key (`sb_publishable_…`) goes to either app. Secret keys stay in Supabase, where Edge Functions receive them as `SUPABASE_SECRET_KEYS`; the legacy `anon`/`service_role` keys are not used. Attach the public and admin domains when the client has them, then update `NUXT_PUBLIC_SITE_URL`, the Auth URLs, and `ADMIN_URL` to match. The admin sends `noindex` and has no public routes; the public site has no admin routes.
