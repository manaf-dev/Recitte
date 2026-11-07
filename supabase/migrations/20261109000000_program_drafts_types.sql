-- Program redesign: one description, drafts, structured time and place, and
-- program types that staff can add.

-- ---------------------------------------------------------------------------
-- Program types: a table instead of an enum, so staff can add their own.
-- `area` decides where a type is listed on the public site.
-- ---------------------------------------------------------------------------
create table public.program_types (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  label text not null check (btrim(label) <> '' and char_length(label) <= 60),
  area text not null check (area in ('academy', 'connect')),
  builtin boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index program_types_label_key on public.program_types (lower(btrim(label)));

insert into public.program_types (slug, label, area, builtin) values
  ('workshop', 'Workshop', 'academy', true),
  ('seminar', 'Monthly seminar', 'academy', true),
  ('course', 'Academy course', 'academy', true),
  ('event', 'Event', 'academy', true),
  ('community', 'Community', 'connect', true),
  ('challenge', 'Qur''an challenge', 'connect', true);

alter table public.program_types enable row level security;

revoke all on public.program_types from anon, authenticated, service_role;
grant select on public.program_types to anon, authenticated;
grant insert on public.program_types to authenticated;
grant select, insert, update, delete on public.program_types to service_role;

create policy "program types are public" on public.program_types
  for select to anon, authenticated using (true);
-- Staff add custom types only. Built-in types are fixed.
create policy "staff insert program types" on public.program_types
  for insert to authenticated with check ((select public.is_staff()) and not builtin);

-- ---------------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------------
alter table public.programs alter column type type text using type::text;
alter table public.programs
  add constraint programs_type_fkey foreign key (type) references public.program_types (slug) on update cascade;
drop type public.program_type;

-- One description: the long text replaces the short one when both exist.
update public.programs set description = btrim(about) where about is not null and btrim(about) <> '';
alter table public.programs drop column about;
alter table public.programs drop constraint programs_description_check;
alter table public.programs
  alter column description set default '',
  add constraint programs_description_len check (char_length(description) <= 5000);

-- Drafts are saved incomplete and hidden from the public until published.
alter table public.programs add column is_draft boolean not null default false;
alter table public.programs
  add constraint programs_published_complete check (is_draft or btrim(description) <> '');

-- Structured time and place. `time`, `duration` and `format` stay as the text
-- the public site shows; the admin writes them from these fields.
alter table public.programs
  add column start_time time,
  add column end_time time,
  add column format_kind text check (format_kind in ('online', 'in_person')),
  add column location text check (char_length(location) <= 200),
  add constraint programs_times_check check (end_time is null or (start_time is not null and end_time > start_time));

-- Existing free-text formats become the location, so the public text is unchanged.
update public.programs set location = left(format, 200) where format is not null;

-- Visitors see published programs only; staff see everything.
drop policy "programs are public" on public.programs;
create policy "published programs are public" on public.programs
  for select to anon, authenticated using (not is_draft or (select public.is_staff()));
