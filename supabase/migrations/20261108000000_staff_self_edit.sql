-- Staff edit their own profile.
--
-- Names: a column-level grant lets authenticated update only first_name and
-- last_name, so role, email, user_id and created_at stay unwritable from the
-- Data API (updating them fails with 42501). The policy limits updates to the
-- caller's own row (other rows match nothing) and refuses clearing a name.
-- The staff_first_name_check / staff_last_name_check constraints still apply.
--
-- Email: changes go through the update-email Edge Function, which keeps
-- auth.users and public.staff in step. Staff emails are unique regardless of
-- case, and failed password checks there are throttled per user.

grant update (first_name, last_name) on public.staff to authenticated;

create policy "staff update own names" on public.staff
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and first_name is not null
    and last_name is not null
  );

create unique index staff_email_lower_key on public.staff (lower(email));

-- Failed current-password checks in update-email, one row per failure.
-- Service role only: RLS is on with no policies and no API grants.
create table public.password_check_failures (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index password_check_failures_user_created_idx
  on public.password_check_failures (user_id, created_at);

alter table public.password_check_failures enable row level security;

revoke all on public.password_check_failures from anon, authenticated, service_role;
grant select, insert, delete on public.password_check_failures to service_role;

-- Whether an email (any case) belongs to an auth user or staff row other than
-- `except_user_id`. Supabase Auth's admin update does not check this itself:
-- it fails on its unique index with a generic 500. Service role only.
create function public.email_in_use(check_email text, except_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(btrim(check_email)) and id <> except_user_id
  ) or exists (
    select 1 from public.staff
    where lower(email) = lower(btrim(check_email)) and user_id <> except_user_id
  );
$$;

revoke execute on function public.email_in_use(text, uuid) from public, anon, authenticated;
grant execute on function public.email_in_use(text, uuid) to service_role;
