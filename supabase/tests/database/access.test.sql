-- Access rules: anonymous visitors versus staff versus super admin.
-- Run with `pnpm db:test` (wraps `supabase test db`) against the local stack.

begin;
create extension if not exists pgtap with schema extensions;

select plan(60);

-- Runs a statement as the current role and returns how many rows it touched.
create function pg_temp.affected(statement text) returns integer
language plpgsql as $fn$
declare n integer;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Fixtures (as the postgres superuser)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'super@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000a2', 'staff@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000a3', 'stranger@example.com', 'authenticated', 'authenticated');

insert into public.staff (user_id, email, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'super@example.com', 'super_admin'),
  ('00000000-0000-4000-8000-0000000000a2', 'staff@example.com', 'staff');

insert into public.programs (id, slug, type, title, description, starts_on, ends_on, status) values
  ('00000000-0000-4000-8000-0000000000b1', 'open-workshop', 'workshop', 'Open Workshop', 'd', public.accra_today() + 10, null, 'open'),
  ('00000000-0000-4000-8000-0000000000b2', 'past-workshop', 'workshop', 'Past Workshop', 'd', public.accra_today() - 1, null, 'open'),
  ('00000000-0000-4000-8000-0000000000b3', 'closed-course', 'course', 'Closed Course', 'd', public.accra_today() + 10, null, 'closed'),
  ('00000000-0000-4000-8000-0000000000b4', 'community', 'community', 'Community', 'd', null, null, 'open'),
  ('00000000-0000-4000-8000-0000000000b5', 'soon-event', 'event', 'Soon Event', 'd', public.accra_today() + 5, null, 'soon'),
  ('00000000-0000-4000-8000-0000000000b6', 'running-seminar', 'seminar', 'Running Seminar', 'd', public.accra_today() - 3, public.accra_today() + 1, 'open'),
  ('00000000-0000-4000-8000-0000000000b7', 'open-seminar', 'seminar', 'Open Seminar', 'd', null, null, 'open');

-- ---------------------------------------------------------------------------
-- Past-date rule matches @recitte/shared isProgramPast
-- ---------------------------------------------------------------------------

select ok(public.program_is_past(public.accra_today() - 1, null), 'starts_on yesterday only is past');
select ok(not public.program_is_past(public.accra_today(), null), 'starts_on today is not past');
select ok(not public.program_is_past(null, null), 'no dates is never past');
select ok(not public.program_is_past(public.accra_today() - 5, public.accra_today()), 'ends_on today is not past');
select ok(public.program_is_past(public.accra_today() - 5, public.accra_today() - 1), 'ends_on yesterday is past');

select throws_ok(
  $$ insert into public.programs (slug, type, title, description, starts_on, ends_on) values ('bad-range', 'event', 't', 'd', '2026-11-14', '2026-11-13') $$,
  '23514', null, 'ends_on before starts_on is rejected'
);
select throws_ok(
  $$ insert into public.programs (slug, type, title, description, starts_on, ends_on) values ('end-only', 'event', 't', 'd', null, '2026-11-13') $$,
  '23514', null, 'ends_on without starts_on is rejected'
);
select throws_ok(
  $$ insert into public.programs (slug, type, title, description) values ('Bad Slug', 'event', 't', 'd') $$,
  '23514', null, 'malformed slug is rejected'
);

-- ---------------------------------------------------------------------------
-- Anonymous visitor
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is((select count(*)::int from public.programs), 7, 'anon reads programs');
select is((select count(*)::int from public.settings), 1, 'anon reads the settings row');
select is((select count(*)::int from public.social_links), 7, 'anon reads social links');
select lives_ok($$ select * from public.testimonials $$, 'anon reads testimonials');

select throws_ok($$ select * from public.applications $$, '42501', null, 'anon cannot read applications');
select throws_ok($$ select * from public.registrations $$, '42501', null, 'anon cannot read registrations');
select throws_ok($$ select * from public.contacts $$, '42501', null, 'anon cannot read contacts');
select throws_ok($$ select * from public.staff $$, '42501', null, 'anon cannot read staff');

select lives_ok(
  $$ insert into public.applications (full_name, email, phone, country, program_id, program_title, level)
     values ('Aisha', 'aisha@example.com', '+233 20 123 4567', 'Ghana', '00000000-0000-4000-8000-0000000000b1', 'spoofed', 'Can read slowly with mistakes') $$,
  'anon submits an application for an open workshop'
);
select lives_ok(
  $$ insert into public.applications (full_name, email, phone, country, program_id, program_title, level)
     values ('Bilal', 'bilal@example.com', '0201234567', 'Ghana', null, 'spoofed', 'Advanced, seeking ijazah') $$,
  'anon submits a "not sure" application'
);
select throws_ok(
  $$ insert into public.applications (status, full_name, email, phone, country, program_id, program_title, level)
     values ('handled', 'Aisha', 'aisha@example.com', '+233 20 123 4567', 'Ghana', null, 'x', 'Can read slowly with mistakes') $$,
  '42501', null, 'anon cannot insert an application that is already handled'
);
select throws_ok(
  $$ insert into public.applications (full_name, email, phone, country, program_id, program_title, level)
     values ('Aisha', 'aisha@example.com', '+233 20 123 4567', 'Ghana', '00000000-0000-4000-8000-0000000000b2', 'x', 'Can read slowly with mistakes') $$,
  '23514', 'Registration for this program has ended', 'application for a past program is rejected'
);
select throws_ok(
  $$ insert into public.applications (full_name, email, phone, country, program_id, program_title, level)
     values ('Aisha', 'aisha@example.com', '+233 20 123 4567', 'Ghana', '00000000-0000-4000-8000-0000000000b3', 'x', 'Can read slowly with mistakes') $$,
  '23514', 'Registration for this program is closed', 'application for a closed course is rejected'
);
select throws_ok(
  $$ insert into public.applications (full_name, email, phone, country, program_id, program_title, level)
     values ('Aisha', 'aisha@example.com', '+233 20 123 4567', 'Ghana', '00000000-0000-4000-8000-0000000000b7', 'x', 'Can read slowly with mistakes') $$,
  '23514', 'This program does not take applications', 'application for a seminar is rejected'
);
select throws_ok(
  $$ insert into public.applications (full_name, email, phone, country, age, program_id, program_title, level)
     values ('Aisha', 'aisha@example.com', '+233 20 123 4567', 'Ghana', 3, null, 'x', 'Can read slowly with mistakes') $$,
  '23514', null, 'application with age 3 is rejected'
);
select throws_ok(
  $$ insert into public.applications (full_name, email, phone, country, program_id, program_title, level)
     values ('Aisha', 'aisha@example', '+233 20 123 4567', 'Ghana', null, 'x', 'Can read slowly with mistakes') $$,
  '23514', null, 'application with a malformed email is rejected'
);
select throws_ok(
  $$ insert into public.applications (full_name, email, phone, country, program_id, program_title, level)
     values ('Aisha', 'aisha@example.com', '123 45', 'Ghana', null, 'x', 'Can read slowly with mistakes') $$,
  '23514', null, 'application with fewer than 7 phone digits is rejected'
);

select lives_ok(
  $$ insert into public.registrations (program_id, program_title, kind, full_name, email)
     values ('00000000-0000-4000-8000-0000000000b5', 'x', 'notify', 'Yusuf', 'yusuf@example.com') $$,
  'anon registers a notify request'
);
select lives_ok(
  $$ insert into public.registrations (program_id, program_title, kind, full_name, email)
     values ('00000000-0000-4000-8000-0000000000b6', 'x', 'interest', 'Yusuf', 'yusuf@example.com') $$,
  'anon saves interest in a seminar that ends tomorrow'
);
select throws_ok(
  $$ insert into public.registrations (program_id, program_title, kind, full_name, email)
     values ('00000000-0000-4000-8000-0000000000b2', 'x', 'interest', 'Yusuf', 'yusuf@example.com') $$,
  '23514', 'Registration for this program has ended', 'registration for a past program is rejected'
);
select throws_ok(
  $$ insert into public.registrations (program_id, program_title, kind, full_name, email)
     values ('00000000-0000-4000-8000-0000000000b4', 'x', 'register', 'Yusuf', 'yusuf@example.com') $$,
  '23514', null, 'registration for a community program is rejected'
);

select lives_ok(
  $$ insert into public.contacts (subject, full_name, email, message)
     values (null, 'Aisha', 'aisha@example.com', 'Assalamu alaikum, a question.') $$,
  'anon sends a contact message with no subject'
);
select throws_ok(
  $$ insert into public.contacts (full_name, email, message) values ('Aisha', 'aisha@example.com', 'too short') $$,
  '23514', null, 'contact message under 10 characters is rejected'
);
select throws_ok(
  $$ insert into public.contacts (subject, full_name, email, message) values ('Spam', 'Aisha', 'aisha@example.com', 'Assalamu alaikum, a question.') $$,
  '23514', null, 'contact with an unknown subject is rejected'
);

select throws_ok($$ update public.settings set hero_title = 'hacked' $$, '42501', null, 'anon cannot update settings');
select throws_ok($$ update public.social_links set active = true $$, '42501', null, 'anon cannot update social links');
select throws_ok(
  $$ insert into public.programs (slug, type, title, description) values ('anon-made', 'event', 't', 'd') $$,
  '42501', null, 'anon cannot insert programs'
);
select throws_ok($$ insert into public.testimonials (quote, name) values ('A long enough quote', 'x') $$, '42501', null, 'anon cannot insert testimonials');
select throws_ok($$ update public.applications set status = 'handled' $$, '42501', null, 'anon cannot update applications');
select throws_ok($$ delete from public.contacts $$, '42501', null, 'anon cannot delete contacts');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('speaker-photos', 'anon.jpg') $$,
  '42501', null, 'anon cannot upload a speaker photo'
);

reset role;

select is(
  (select program_title from public.applications where email = 'aisha@example.com'),
  'Open Workshop', 'application title comes from the program, not the client'
);
select is(
  (select program_title from public.applications where email = 'bilal@example.com'),
  'Not sure, please advise', '"not sure" applications are titled as such'
);

-- ---------------------------------------------------------------------------
-- Signed-in user who is not staff
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}';

select is((select count(*)::int from public.applications), 0, 'non-staff user sees no applications');
select is((select count(*)::int from public.staff), 0, 'non-staff user sees no staff rows');
select is(pg_temp.affected($$ update public.programs set title = 'x' $$), 0, 'non-staff user cannot update programs');
select is(pg_temp.affected($$ delete from public.applications $$), 0, 'non-staff user cannot delete applications');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('speaker-photos', 'stranger.jpg') $$,
  '42501', null, 'non-staff user cannot upload a speaker photo'
);

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';

select is((select count(*)::int from public.applications where email in ('aisha@example.com', 'bilal@example.com')), 2, 'staff read applications');
select is(
  pg_temp.affected($$ update public.applications set status = 'handled' where email = 'aisha@example.com' $$),
  1, 'staff mark an application handled'
);
select is((select status::text from public.applications where email = 'aisha@example.com'), 'handled', 'the status is handled');
select is(
  pg_temp.affected($$ update public.applications set status = 'new' where email = 'aisha@example.com' $$),
  1, 'staff move an application back to new'
);
select is(pg_temp.affected($$ delete from public.contacts where email = 'aisha@example.com' $$), 1, 'staff delete a contact');
select throws_ok(
  $$ insert into public.registrations (program_id, program_title, kind, full_name, email)
     values ('00000000-0000-4000-8000-0000000000b2', 'x', 'register', 'Staff', 'staff@example.com') $$,
  '23514', 'Registration for this program has ended', 'staff cannot register for a past program either'
);
select is((select count(*)::int from public.staff), 1, 'staff see only their own staff row');
select ok(not public.is_super_admin(), 'staff are not super admins');
select throws_ok(
  $$ insert into public.staff (user_id, email, role) values ('00000000-0000-4000-8000-0000000000a3', 'stranger@example.com', 'staff') $$,
  '42501', null, 'staff cannot add staff rows'
);
select is(pg_temp.affected($$ update public.settings set hero_intro = 'Updated' $$), 1, 'staff update settings');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('speaker-photos', 'staff.jpg') $$,
  'staff upload a speaker photo'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('other-bucket', 'staff.jpg') $$,
  null, null, 'staff cannot write outside the speaker-photos bucket'
);

-- ---------------------------------------------------------------------------
-- Super admin
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}';

select is((select count(*)::int from public.staff), 2, 'super admin lists every staff row');
select throws_ok(
  $$ update public.staff set role = 'super_admin' where user_id = '00000000-0000-4000-8000-0000000000a2' $$,
  '42501', null, 'super admin cannot promote staff through the API'
);

reset role;

select * from finish();
rollback;
