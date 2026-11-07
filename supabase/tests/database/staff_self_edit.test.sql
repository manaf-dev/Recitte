-- Staff edit their own first and last name, and nothing else.
-- Run with `pnpm db:test` (wraps `supabase test db`) against the local stack.

begin;
create extension if not exists pgtap with schema extensions;

select plan(35);

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

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-0000000000d1', 'self@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000d2', 'other@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000d3', 'boss@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000d4', 'outsider@example.com', 'authenticated', 'authenticated');

insert into public.staff (user_id, email, role, first_name, last_name) values
  ('00000000-0000-4000-8000-0000000000d1', 'self@example.com', 'staff', 'Aisha', 'Mensah'),
  ('00000000-0000-4000-8000-0000000000d2', 'other@example.com', 'staff', 'Kofi', 'Owusu'),
  ('00000000-0000-4000-8000-0000000000d3', 'boss@example.com', 'super_admin', 'Ama', 'Boateng');

-- ---------------------------------------------------------------------------
-- Plain staff
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}';

select is(
  pg_temp.affected($$ update public.staff set first_name = 'Aishat', last_name = 'Mensah-Ofori'
                     where user_id = '00000000-0000-4000-8000-0000000000d1' $$),
  1, 'staff update their own names'
);
select is(
  (select first_name || ' ' || last_name from public.staff where user_id = '00000000-0000-4000-8000-0000000000d1'),
  'Aishat Mensah-Ofori', 'the new names are saved'
);
select is(
  pg_temp.affected($$ update public.staff set first_name = 'Hacked' where user_id = '00000000-0000-4000-8000-0000000000d2' $$),
  0, 'staff cannot rename another staff member'
);
select is(
  pg_temp.affected($$ update public.staff set first_name = 'Hacked' $$),
  1, 'an unfiltered update touches only their own row'
);
select throws_ok(
  $$ update public.staff set role = 'super_admin' where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '42501', null, 'staff cannot promote themselves'
);
select throws_ok(
  $$ update public.staff set email = 'new@example.com' where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '42501', null, 'staff cannot change their email through the API'
);
select throws_ok(
  $$ update public.staff set user_id = '00000000-0000-4000-8000-0000000000d4' where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '42501', null, 'staff cannot change their user_id'
);
select throws_ok(
  $$ update public.staff set created_at = now() where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '42501', null, 'staff cannot change created_at'
);
select throws_ok(
  $$ update public.staff set first_name = '' where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '23514', null, 'an empty first name is still refused'
);
select throws_ok(
  $$ update public.staff set last_name = repeat('b', 81) where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '23514', null, 'an 81-character last name is still refused'
);
select throws_ok(
  $$ update public.staff set first_name = ' Aisha' where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '23514', null, 'an untrimmed first name is still refused'
);
select throws_ok(
  $$ update public.staff set first_name = null where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '42501', null, 'staff cannot clear their first name'
);
select throws_ok(
  $$ update public.staff set last_name = null where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '42501', null, 'staff cannot clear their last name'
);
select throws_ok(
  $$ select * from public.password_check_failures $$,
  '42501', null, 'staff cannot read password check failures'
);
select throws_ok(
  $$ insert into public.password_check_failures (user_id) values ('00000000-0000-4000-8000-0000000000d1') $$,
  '42501', null, 'staff cannot record password check failures'
);
select throws_ok(
  $$ delete from public.password_check_failures $$,
  '42501', null, 'staff cannot clear password check failures'
);
select throws_ok(
  $$ select public.email_in_use('other@example.com', '00000000-0000-4000-8000-0000000000d1') $$,
  '42501', null, 'staff cannot probe for emails in use'
);

-- ---------------------------------------------------------------------------
-- Super admin: same rule, only their own row
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000d3","role":"authenticated"}';

select is(
  pg_temp.affected($$ update public.staff set last_name = 'Changed' where user_id = '00000000-0000-4000-8000-0000000000d2' $$),
  0, 'a super admin cannot rename other staff through the API'
);
select is(
  pg_temp.affected($$ update public.staff set last_name = 'Boateng-Asare' where user_id = '00000000-0000-4000-8000-0000000000d3' $$),
  1, 'a super admin updates their own names'
);

-- ---------------------------------------------------------------------------
-- Signed in but not staff: no row to touch
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000d4","role":"authenticated"}';

select is(
  pg_temp.affected($$ update public.staff set first_name = 'Hacked' $$),
  0, 'a non-staff user changes no staff rows'
);

-- ---------------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$ update public.staff set first_name = 'Hacked' where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '42501', null, 'anon cannot update staff'
);
select throws_ok(
  $$ select * from public.password_check_failures $$,
  '42501', null, 'anon cannot read password check failures'
);
select throws_ok(
  $$ select public.email_in_use('other@example.com', '00000000-0000-4000-8000-0000000000d1') $$,
  '42501', null, 'anon cannot probe for emails in use'
);

-- ---------------------------------------------------------------------------
-- Service role (Edge Functions)
-- ---------------------------------------------------------------------------
reset role;
set local role service_role;

select lives_ok(
  $$ insert into public.password_check_failures (user_id) values ('00000000-0000-4000-8000-0000000000d1') $$,
  'the service role records a password check failure'
);
select is(
  (select count(*)::int from public.password_check_failures
    where user_id = '00000000-0000-4000-8000-0000000000d1' and created_at > now() - interval '15 minutes'),
  1, 'the service role counts recent failures'
);
select is(
  pg_temp.affected($$ delete from public.password_check_failures where user_id = '00000000-0000-4000-8000-0000000000d1' $$),
  1, 'the service role clears failures'
);
select ok(
  public.email_in_use(' Other@Example.com ', '00000000-0000-4000-8000-0000000000d1'),
  'email_in_use finds another staff member''s email in any case'
);
select ok(
  public.email_in_use('OUTSIDER@example.com', '00000000-0000-4000-8000-0000000000d1'),
  'email_in_use finds an auth user with no staff row'
);
select ok(
  not public.email_in_use('self@example.com', '00000000-0000-4000-8000-0000000000d1'),
  'email_in_use ignores the caller''s own account'
);
select ok(
  not public.email_in_use('nobody@example.com', '00000000-0000-4000-8000-0000000000d1'),
  'email_in_use is false for an unused email'
);

reset role;

select is(
  (select first_name || ' ' || last_name from public.staff where user_id = '00000000-0000-4000-8000-0000000000d2'),
  'Kofi Owusu', 'the other staff row is unchanged'
);
select is(
  (select email || ' ' || role::text from public.staff where user_id = '00000000-0000-4000-8000-0000000000d1'),
  'self@example.com staff', 'email and role are unchanged'
);

-- ---------------------------------------------------------------------------
-- Staff emails are unique regardless of case
-- ---------------------------------------------------------------------------
select has_index('public', 'staff', 'staff_email_lower_key', 'staff has a unique lower(email) index');
select throws_ok(
  $$ insert into public.staff (user_id, email) values ('00000000-0000-4000-8000-0000000000d4', 'Other@Example.com') $$,
  '23505', null, 'a second staff row with the same email in another case is refused'
);
select throws_ok(
  $$ update public.staff set email = 'OTHER@example.com' where user_id = '00000000-0000-4000-8000-0000000000d1' $$,
  '23505', null, 'changing to another staff member''s email is refused'
);

select * from finish();
rollback;
