# Recitte

The Recitte monorepo: a public site, a staff admin, and the Supabase backend behind both. The brief is `docs/superpowers/specs/2026-10-25-recitte-site-design.md`; the implementation plans are in `docs/superpowers/plans/`. Branch `prototype` is the visual and copy reference only. It is never merged here.

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
cp apps/web/.env.example apps/web/.env   # fill in the URL and anon key from `pnpm db:start`
pnpm --filter @recitte/web dev           # http://localhost:3000
```

Pages read programs, testimonials, settings and social links with the anon key and insert applications, registrations and contact messages; Row Level Security does the rest. Program pages render on the server with Open Graph tags, so a link under a flyer previews with the title, date and image. Set `NUXT_PUBLIC_SITE_URL` to the public origin so share links and `og:url` are canonical.

### Create the first super admin

Public sign-up is disabled. The first account is made by hand, locally in Studio (http://127.0.0.1:54323) or in the Supabase dashboard for production:

1. **Authentication → Users → Add user**. Enter the email and tick *Auto confirm*.
2. **SQL editor**, with that user's id:

   ```sql
   insert into public.staff (user_id, email, role)
   values ('<auth user id>', '<email>', 'super_admin');
   ```

That person signs in to the admin with a magic link and invites everyone else from the Staff screen. Invited people are always `staff`. Another super admin, if ever needed, is set the same way in SQL.

### Edge Functions

| Function | Who may call | What it does |
| --- | --- | --- |
| `invite-staff` | super admin | Sends a Supabase Auth invite and adds a `staff` row |
| `remove-staff` | super admin | Deletes another staff member's auth user (their row goes with it). Cannot remove yourself |

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
supabase functions deploy invite-staff remove-staff notify-submission
```

Then, in the dashboard:

1. **Authentication → Sign In / Providers**: turn off *Allow new users to sign up*. Keep the Email provider on (magic links and invites use it).
2. **Authentication → URL Configuration**: set *Site URL* to the admin origin (`https://admin.example.org`) and add `https://admin.example.org/**` to *Redirect URLs*. Magic links and invites land on `/auth/callback` there.
3. Create the first super admin (above).
4. Set the function secrets and Vault entries (above).

### Vercel

| Project | Root directory | Framework | Environment variables |
| --- | --- | --- | --- |
| recitte-web | `apps/web` | Nuxt | `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY`, `NUXT_PUBLIC_SITE_URL` |
| recitte-admin | `apps/admin` | Vite | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_SITE_URL` (optional, for the "View site" link) |

Both use the default install command (Vercel detects pnpm from the lockfile) and include files outside the root directory, so the workspace package resolves. Only the anon key goes to either app; the service role key stays in Supabase function secrets. Attach the public and admin domains when the client has them, then update `NUXT_PUBLIC_SITE_URL`, the Auth URLs, and `ADMIN_URL` to match. The admin sends `noindex` and has no public routes; the public site has no admin routes.
