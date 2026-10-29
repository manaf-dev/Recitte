-- Recitte schema, access rules and storage.
--
-- Row Level Security is the access boundary. Anonymous visitors read public
-- content and may only insert new submissions. Staff (rows in public.staff)
-- read and write content and inboxes. Only a super admin may list staff, and
-- staff rows are written only by Edge Functions holding the service role.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.program_type as enum ('workshop', 'seminar', 'course', 'community', 'challenge', 'event');
create type public.program_status as enum ('open', 'soon', 'closed');
create type public.registration_kind as enum ('register', 'notify', 'interest');
create type public.submission_status as enum ('new', 'handled');
create type public.staff_role as enum ('super_admin', 'staff');
create type public.social_platform as enum ('whatsapp', 'instagram', 'facebook', 'tiktok', 'youtube', 'x', 'telegram');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Same rule as the browser: a name, an @, and a dot in the domain.
create function public.is_valid_email(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$';
$$;

create function public.digit_count(value text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select length(regexp_replace(coalesce(value, ''), '\D', '', 'g'));
$$;

-- Today's calendar date in Africa/Accra.
create function public.accra_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Africa/Accra')::date;
$$;

-- Mirrors isProgramPast in @recitte/shared: past when the last day (ends_on,
-- else starts_on) is before today in Accra; never past without starts_on.
create function public.program_is_past(starts_on date, ends_on date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select starts_on is not null and coalesce(ends_on, starts_on) < public.accra_today();
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role public.staff_role not null default 'staff',
  created_at timestamptz not null default now()
);

-- Security definer so policies can ask without recursing through staff RLS.
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = (select auth.uid()));
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff where user_id = (select auth.uid()) and role = 'super_admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  type public.program_type not null,
  title text not null check (btrim(title) <> '' and char_length(title) <= 200),
  description text not null check (btrim(description) <> '' and char_length(description) <= 1000),
  about text check (char_length(about) <= 10000),
  highlights text[] not null default '{}',
  starts_on date,
  ends_on date,
  time text check (char_length(time) <= 200),
  duration text check (char_length(duration) <= 200),
  format text check (char_length(format) <= 200),
  extra_details jsonb not null default '[]' check (jsonb_typeof(extra_details) = 'array'),
  speaker text check (char_length(speaker) <= 200),
  speaker_bio text check (char_length(speaker_bio) <= 5000),
  speaker_photo_url text,
  status public.program_status not null default 'open',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- An end date needs a start date, so "no starts_on is never past" holds.
  constraint programs_dates_check check (ends_on is null or (starts_on is not null and ends_on >= starts_on))
);

create trigger programs_updated_at before update on public.programs
  for each row execute function public.set_updated_at();

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null check (char_length(btrim(quote)) >= 10 and char_length(quote) <= 1000),
  name text not null check (btrim(name) <> '' and char_length(name) <= 200),
  session text check (char_length(session) <= 200),
  created_at timestamptz not null default now()
);

create table public.settings (
  id boolean primary key default true check (id),
  hero_title text not null check (btrim(hero_title) <> ''),
  hero_intro text not null default '',
  email text not null check (public.is_valid_email(email)),
  phone text not null default '',
  whatsapp text not null check (public.digit_count(whatsapp) >= 7),
  community_link text not null default '' check (community_link = '' or community_link ~ '^https?://'),
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

create table public.social_links (
  platform public.social_platform primary key,
  url text not null default '' check (url = '' or url ~ '^https?://'),
  active boolean not null default false,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Inboxes
-- ---------------------------------------------------------------------------

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status public.submission_status not null default 'new',
  full_name text not null check (btrim(full_name) <> '' and char_length(full_name) <= 200),
  email text not null check (public.is_valid_email(email) and char_length(email) <= 320),
  phone text not null check (public.digit_count(phone) >= 7 and char_length(phone) <= 40),
  country text not null check (btrim(country) <> '' and char_length(country) <= 100),
  age integer check (age between 5 and 100),
  program_id uuid references public.programs (id) on delete set null,
  program_title text not null,
  level text not null check (level in (
    'Beginner, cannot yet read Arabic',
    'Can read slowly with mistakes',
    'Read fluently, learning Tajweed',
    'Advanced, seeking ijazah'
  )),
  tajweed_experience text check (tajweed_experience in ('None', 'Some informal learning', 'Formal Tajweed study')),
  additional_info text check (char_length(additional_info) <= 5000)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status public.submission_status not null default 'new',
  -- Nullable so deleting a program keeps its registrations; inserts require it.
  program_id uuid references public.programs (id) on delete set null,
  program_title text not null,
  kind public.registration_kind not null,
  full_name text not null check (btrim(full_name) <> '' and char_length(full_name) <= 200),
  email text not null check (public.is_valid_email(email) and char_length(email) <= 320),
  phone text check (char_length(phone) <= 40)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status public.submission_status not null default 'new',
  subject text check (subject in ('General', 'Recitte Academy', 'Community', 'Partnership')),
  full_name text not null check (btrim(full_name) <> '' and char_length(full_name) <= 200),
  email text not null check (public.is_valid_email(email) and char_length(email) <= 320),
  phone text check (char_length(phone) <= 40),
  message text not null check (char_length(btrim(message)) between 10 and 1000)
);

create index applications_created_at_idx on public.applications (created_at desc);
create index registrations_created_at_idx on public.registrations (created_at desc);
create index contacts_created_at_idx on public.contacts (created_at desc);
create index applications_new_idx on public.applications (status) where status = 'new';
create index registrations_new_idx on public.registrations (status) where status = 'new';
create index contacts_new_idx on public.contacts (status) where status = 'new';
create index applications_program_id_idx on public.applications (program_id);
create index registrations_program_id_idx on public.registrations (program_id);

-- Inserts take the program title from the program itself and refuse programs
-- that are past or closed. Updates (status changes by staff) are not checked.
create function public.check_application_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  p public.programs;
begin
  new.created_at := now();
  if new.program_id is null then
    new.program_title := 'Not sure, please advise';
    return new;
  end if;

  select * into p from public.programs where id = new.program_id;
  if not found then
    raise exception 'Unknown program' using errcode = '23503';
  end if;
  if p.type not in ('workshop', 'course') then
    raise exception 'This program does not take applications' using errcode = '23514';
  end if;
  if public.program_is_past(p.starts_on, p.ends_on) then
    raise exception 'Registration for this program has ended' using errcode = '23514';
  end if;
  if p.status = 'closed' then
    raise exception 'Registration for this program is closed' using errcode = '23514';
  end if;

  new.program_title := p.title;
  return new;
end;
$$;

create trigger applications_check_insert before insert on public.applications
  for each row execute function public.check_application_insert();

create function public.check_registration_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  p public.programs;
begin
  new.created_at := now();
  if new.program_id is null then
    raise exception 'A registration needs a program' using errcode = '23502';
  end if;

  select * into p from public.programs where id = new.program_id;
  if not found then
    raise exception 'Unknown program' using errcode = '23503';
  end if;
  if p.type = 'community' then
    raise exception 'Community programs are joined on WhatsApp' using errcode = '23514';
  end if;
  if public.program_is_past(p.starts_on, p.ends_on) then
    raise exception 'Registration for this program has ended' using errcode = '23514';
  end if;
  if p.status = 'closed' then
    raise exception 'Registration for this program is closed' using errcode = '23514';
  end if;

  new.program_title := p.title;
  return new;
end;
$$;

create trigger registrations_check_insert before insert on public.registrations
  for each row execute function public.check_registration_insert();

create function public.stamp_contact_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

create trigger contacts_stamp_insert before insert on public.contacts
  for each row execute function public.stamp_contact_insert();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.staff enable row level security;
alter table public.programs enable row level security;
alter table public.testimonials enable row level security;
alter table public.settings enable row level security;
alter table public.social_links enable row level security;
alter table public.applications enable row level security;
alter table public.registrations enable row level security;
alter table public.contacts enable row level security;

-- Explicit Data API grants. Supabase no longer grants new public tables to
-- anon/authenticated/service_role by default, so every privilege the API needs
-- is stated here, next to RLS. Anything not granted fails loudly (42501)
-- instead of silently matching no rows. Revokes first make this hold whether
-- or not the project still has the old default privileges.
revoke all on
  public.staff, public.programs, public.testimonials, public.settings, public.social_links,
  public.applications, public.registrations, public.contacts
from anon, authenticated, service_role;

-- Public content: everyone reads; signed-in staff write (RLS checks is_staff).
grant select on public.programs, public.testimonials, public.settings, public.social_links to anon, authenticated;
grant insert, update, delete on public.programs, public.testimonials to authenticated;
grant update on public.settings, public.social_links to authenticated;

-- Inboxes: anyone inserts; staff read, change status, delete.
grant insert on public.applications, public.registrations, public.contacts to anon, authenticated;
grant select, update, delete on public.applications, public.registrations, public.contacts to authenticated;

-- Staff rows: readable per RLS; written only by Edge Functions.
grant select on public.staff to authenticated;

-- Edge Functions use a secret key (the service_role role): RLS is bypassed,
-- privileges are not.
grant select, insert, update, delete on
  public.staff, public.programs, public.testimonials, public.settings, public.social_links,
  public.applications, public.registrations, public.contacts
to service_role;

-- Functions are executable by PUBLIC by default. Keep only what RLS policies
-- and checks call; triggers run regardless of EXECUTE.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_staff(), public.is_super_admin(), public.is_valid_email(text), public.digit_count(text),
  public.accra_today(), public.program_is_past(date, date)
to anon, authenticated, service_role;

-- Staff: you may read your own row; a super admin may read every row.
-- No write policies: invites and removals go through service-role functions.
create policy "staff read own row or all as super admin" on public.staff
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_super_admin()));

-- Public content: anyone reads, staff write.
create policy "programs are public" on public.programs
  for select to anon, authenticated using (true);
create policy "staff insert programs" on public.programs
  for insert to authenticated with check ((select public.is_staff()));
create policy "staff update programs" on public.programs
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff delete programs" on public.programs
  for delete to authenticated using ((select public.is_staff()));

create policy "testimonials are public" on public.testimonials
  for select to anon, authenticated using (true);
create policy "staff insert testimonials" on public.testimonials
  for insert to authenticated with check ((select public.is_staff()));
create policy "staff update testimonials" on public.testimonials
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff delete testimonials" on public.testimonials
  for delete to authenticated using ((select public.is_staff()));

create policy "settings are public" on public.settings
  for select to anon, authenticated using (true);
create policy "staff update settings" on public.settings
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "social links are public" on public.social_links
  for select to anon, authenticated using (true);
create policy "staff update social links" on public.social_links
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- Inboxes: anyone may insert a new submission; only staff read, update, delete.
create policy "anyone submits a new application" on public.applications
  for insert to anon, authenticated with check (status = 'new');
create policy "staff read applications" on public.applications
  for select to authenticated using ((select public.is_staff()));
create policy "staff update applications" on public.applications
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff delete applications" on public.applications
  for delete to authenticated using ((select public.is_staff()));

create policy "anyone submits a new registration" on public.registrations
  for insert to anon, authenticated with check (status = 'new');
create policy "staff read registrations" on public.registrations
  for select to authenticated using ((select public.is_staff()));
create policy "staff update registrations" on public.registrations
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff delete registrations" on public.registrations
  for delete to authenticated using ((select public.is_staff()));

create policy "anyone submits a new contact" on public.contacts
  for insert to anon, authenticated with check (status = 'new');
create policy "staff read contacts" on public.contacts
  for select to authenticated using ((select public.is_staff()));
create policy "staff update contacts" on public.contacts
  for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff delete contacts" on public.contacts
  for delete to authenticated using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Storage: public speaker photos, staff-only writes
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('speaker-photos', 'speaker-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "staff read speaker photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'speaker-photos' and (select public.is_staff()));
create policy "staff upload speaker photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'speaker-photos' and (select public.is_staff()));
create policy "staff replace speaker photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'speaker-photos' and (select public.is_staff()))
  with check (bucket_id = 'speaker-photos' and (select public.is_staff()));
create policy "staff delete speaker photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'speaker-photos' and (select public.is_staff()));
