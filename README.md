# Recitte

The Recitte monorepo: a public site, a staff admin, and the Supabase backend behind both. The brief is `docs/superpowers/specs/2026-10-25-recitte-site-design.md`; the implementation plans are in `docs/superpowers/plans/`. Branch `prototype` is the visual and copy reference only. It is never merged here.

## Workspace

```
apps/web/          Nuxt public site (@recitte/web)
apps/admin/        Vite + Vue admin (@recitte/admin)
packages/shared/   types and pure helpers (@recitte/shared)
supabase/          migrations, seed, Edge Functions, database tests
```

Requires Node 22.12+ and pnpm 10 (`corepack enable` or `npx pnpm@10`).

```bash
pnpm install
pnpm test
```
