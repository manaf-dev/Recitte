-- Staff manage custom program types; built-ins and types in use are protected.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

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
  ('00000000-0000-4000-8000-0000000000e1', 'staff@example.com', 'authenticated', 'authenticated');
insert into public.staff (user_id, email, role) values
  ('00000000-0000-4000-8000-0000000000e1', 'staff@example.com', 'staff');

insert into public.program_types (slug, label, area) values
  ('fireside', 'Fireside chat', 'academy'),
  ('unused', 'Unused', 'academy');
insert into public.programs (slug, type, title, description) values ('uses-fireside', 'fireside', 't', 'd');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ update public.program_types set label = 'x' where slug = 'fireside' $$, '42501', null, 'anon cannot rename a type');
select throws_ok($$ delete from public.program_types where slug = 'unused' $$, '42501', null, 'anon cannot delete a type');

set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000e1"}';
select is(pg_temp.affected($$ update public.program_types set label = 'Fireside talk', area = 'connect' where slug = 'fireside' $$), 1, 'staff rename a custom type and move its area');
select is(pg_temp.affected($$ update public.program_types set label = 'Renamed' where slug = 'workshop' $$), 0, 'staff cannot rename a built-in type');
select throws_ok($$ update public.program_types set slug = 'other' where slug = 'fireside' $$, '42501', null, 'the slug cannot be changed');
select throws_ok($$ update public.program_types set label = 'workshop' where slug = 'unused' $$, '23505', null, 'a rename cannot duplicate a label');
select is(pg_temp.affected($$ delete from public.program_types where slug = 'workshop' $$), 0, 'staff cannot delete a built-in type');
select throws_ok($$ delete from public.program_types where slug = 'fireside' $$, '23503', null, 'a type in use cannot be deleted');
select is(pg_temp.affected($$ delete from public.program_types where slug = 'unused' $$), 1, 'staff delete an unused custom type');

select * from finish();
rollback;
