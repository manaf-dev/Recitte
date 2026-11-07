-- At least one super admin always remains (keep_a_super_admin trigger).
-- Run with `pnpm db:test` (wraps `supabase test db`) against the local stack.

begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-0000000000e1', 'first@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000e2', 'second@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000e3', 'helper@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000e4', 'helper2@example.com', 'authenticated', 'authenticated');

-- Only super admin: demoting or deleting it fails.
insert into public.staff (user_id, email, role) values
  ('00000000-0000-4000-8000-0000000000e1', 'first@example.com', 'super_admin'),
  ('00000000-0000-4000-8000-0000000000e3', 'helper@example.com', 'staff'),
  ('00000000-0000-4000-8000-0000000000e4', 'helper2@example.com', 'staff');

select throws_ok(
  $$ update public.staff set role = 'staff' where user_id = '00000000-0000-4000-8000-0000000000e1' $$,
  'P0001', 'At least one super admin must remain.', 'the last super admin cannot be demoted'
);
select throws_ok(
  $$ delete from public.staff where user_id = '00000000-0000-4000-8000-0000000000e1' $$,
  'P0001', 'At least one super admin must remain.', 'the last super admin row cannot be deleted'
);
select throws_ok(
  $$ delete from auth.users where id = '00000000-0000-4000-8000-0000000000e1' $$,
  'P0001', 'At least one super admin must remain.', 'deleting the last super admin auth user is refused through the cascade'
);
select lives_ok(
  $$ update public.staff set role = 'super_admin' where user_id = '00000000-0000-4000-8000-0000000000e1' $$,
  'setting super_admin on a super admin again is allowed'
);
select lives_ok(
  $$ update public.staff set email = 'first@example.com' where user_id = '00000000-0000-4000-8000-0000000000e1' $$,
  'other columns of the last super admin can still change'
);

-- Staff rows are unaffected.
select lives_ok(
  $$ update public.staff set role = 'staff' where user_id = '00000000-0000-4000-8000-0000000000e3' $$,
  'a staff row can be updated'
);
select lives_ok(
  $$ delete from public.staff where user_id = '00000000-0000-4000-8000-0000000000e3' $$,
  'a staff row can be deleted'
);
select lives_ok(
  $$ delete from auth.users where id = '00000000-0000-4000-8000-0000000000e4' $$,
  'a staff auth user can be deleted (cascade)'
);
select is((select count(*)::int from public.staff where role = 'staff'), 0, 'both staff rows are gone');

-- Two super admins: one can go, but not both.
insert into public.staff (user_id, email, role) values
  ('00000000-0000-4000-8000-0000000000e2', 'second@example.com', 'super_admin');

select throws_ok(
  $$ update public.staff set role = 'staff' where role = 'super_admin' $$,
  'P0001', 'At least one super admin must remain.', 'both super admins cannot be demoted in one statement'
);
select throws_ok(
  $$ delete from public.staff where role = 'super_admin' $$,
  'P0001', 'At least one super admin must remain.', 'both super admins cannot be deleted in one statement'
);
select lives_ok(
  $$ update public.staff set role = 'staff' where user_id = '00000000-0000-4000-8000-0000000000e2' $$,
  'with two super admins, one can be demoted'
);
select lives_ok(
  $$ update public.staff set role = 'super_admin' where user_id = '00000000-0000-4000-8000-0000000000e2' $$,
  'and promoted back'
);
select lives_ok(
  $$ delete from auth.users where id = '00000000-0000-4000-8000-0000000000e1' $$,
  'with two super admins, one can be deleted (cascade from auth.users)'
);

select * from finish();
rollback;
