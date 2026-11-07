-- Drafts are hidden from visitors; staff add custom program types.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-0000000000c1', 'staff@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000c2', 'stranger@example.com', 'authenticated', 'authenticated');
insert into public.staff (user_id, email, role) values
  ('00000000-0000-4000-8000-0000000000c1', 'staff@example.com', 'staff');

insert into public.programs (id, slug, type, title, description, is_draft) values
  ('00000000-0000-4000-8000-0000000000d1', 'live-one', 'workshop', 'Live', 'Published text', false),
  ('00000000-0000-4000-8000-0000000000d2', 'draft-one', 'workshop', 'Draft', '', true);

-- Schema rules (superuser)
select throws_ok(
  $$ insert into public.programs (slug, type, title, description) values ('empty-live', 'event', 't', '') $$,
  '23514', null, 'a published program needs a description'
);
select lives_ok(
  $$ insert into public.programs (slug, type, title, description, is_draft) values ('empty-draft', 'event', 't', '', true) $$,
  'a draft may have no description'
);
select throws_ok(
  $$ insert into public.programs (slug, type, title, description) values ('bad-type', 'nonsense', 't', 'd') $$,
  '23503', null, 'a program needs a known type'
);
select throws_ok(
  $$ insert into public.programs (slug, type, title, description, start_time, end_time) values ('bad-times', 'event', 't', 'd', '19:00', '18:00') $$,
  '23514', null, 'end time must be after start time'
);
select throws_ok(
  $$ insert into public.programs (slug, type, title, description, end_time) values ('end-only-time', 'event', 't', 'd', '18:00') $$,
  '23514', null, 'an end time needs a start time'
);

-- Visitors
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is((select count(*)::int from public.programs where id in ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d2')), 1, 'anon sees the published program only');
select is((select count(*)::int from public.program_types), 6, 'anon reads program types');
select throws_ok(
  $$ insert into public.program_types (slug, label, area) values ('anon-type', 'Anon', 'academy') $$,
  '42501', null, 'anon cannot add a type'
);

-- Staff
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000c1"}';

select is((select count(*)::int from public.programs where id in ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d2')), 2, 'staff see drafts too');
select lives_ok(
  $$ insert into public.program_types (slug, label, area) values ('fireside', 'Fireside chat', 'academy') $$,
  'staff add a custom type'
);
select throws_ok(
  $$ insert into public.program_types (slug, label, area) values ('fireside-2', 'fireside chat', 'academy') $$,
  '23505', null, 'type labels are unique ignoring case'
);
select throws_ok(
  $$ insert into public.program_types (slug, label, area, builtin) values ('fake-builtin', 'Fake', 'academy', true) $$,
  '42501', null, 'staff cannot add built-in types'
);

-- Non-staff
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000c2"}';

select is((select count(*)::int from public.programs where id in ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d2')), 1, 'a non-staff user does not see drafts');

select * from finish();
rollback;
