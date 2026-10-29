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
