-- Staff first and last names: optional for old rows, trimmed and 1 to 80 characters otherwise.
-- Run with `pnpm db:test` (wraps `supabase test db`) against the local stack.

begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

select has_column('public', 'staff', 'first_name', 'staff has a first_name column');
select has_column('public', 'staff', 'last_name', 'staff has a last_name column');
select col_type_is('public', 'staff', 'first_name', 'text', 'first_name is text');
select col_type_is('public', 'staff', 'last_name', 'text', 'last_name is text');
select col_is_null('public', 'staff', 'first_name', 'first_name is nullable for rows from before names');
select col_is_null('public', 'staff', 'last_name', 'last_name is nullable for rows from before names');

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-0000000000c1', 'named@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000c2', 'unnamed@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000c3', 'long@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000c4', 'bad@example.com', 'authenticated', 'authenticated');

select lives_ok(
  $$ insert into public.staff (user_id, email, first_name, last_name)
     values ('00000000-0000-4000-8000-0000000000c1', 'named@example.com', 'Aisha', 'Mensah') $$,
  'a staff row saves with names'
);
select lives_ok(
  $$ insert into public.staff (user_id, email) values ('00000000-0000-4000-8000-0000000000c2', 'unnamed@example.com') $$,
  'a staff row still saves without names'
);
select lives_ok(
  $$ insert into public.staff (user_id, email, first_name, last_name)
     values ('00000000-0000-4000-8000-0000000000c3', 'long@example.com', repeat('a', 80), repeat('b', 80)) $$,
  'an 80-character name is allowed'
);

select throws_ok(
  $$ insert into public.staff (user_id, email, first_name, last_name)
     values ('00000000-0000-4000-8000-0000000000c4', 'bad@example.com', '', 'Mensah') $$,
  '23514', null, 'an empty first name is refused'
);
select throws_ok(
  $$ insert into public.staff (user_id, email, first_name, last_name)
     values ('00000000-0000-4000-8000-0000000000c4', 'bad@example.com', ' Aisha', 'Mensah') $$,
  '23514', null, 'an untrimmed first name is refused'
);
select throws_ok(
  $$ insert into public.staff (user_id, email, first_name, last_name)
     values ('00000000-0000-4000-8000-0000000000c4', 'bad@example.com', repeat('a', 81), 'Mensah') $$,
  '23514', null, 'an 81-character first name is refused'
);
select throws_ok(
  $$ insert into public.staff (user_id, email, first_name, last_name)
     values ('00000000-0000-4000-8000-0000000000c4', 'bad@example.com', 'Aisha', '') $$,
  '23514', null, 'an empty last name is refused'
);
select throws_ok(
  $$ insert into public.staff (user_id, email, first_name, last_name)
     values ('00000000-0000-4000-8000-0000000000c4', 'bad@example.com', 'Aisha', 'Mensah ') $$,
  '23514', null, 'an untrimmed last name is refused'
);

-- The table-level select grant covers the new columns. Since the staff_self_edit
-- migration staff may change their own names, but not their email.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}';

select is(
  (select first_name || ' ' || last_name from public.staff where user_id = '00000000-0000-4000-8000-0000000000c1'),
  'Aisha Mensah', 'staff read their own names'
);
select throws_ok(
  $$ update public.staff set email = 'changed@example.com' where user_id = '00000000-0000-4000-8000-0000000000c1' $$,
  '42501', null, 'staff cannot change their email through the API'
);

reset role;

select * from finish();
rollback;
