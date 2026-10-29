-- Submission emails never block or undo a submission.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- No Vault secrets: inserting works and nothing is queued.
delete from vault.secrets where name in ('notify_submission_url', 'notify_submission_secret');
select set_eq(
  $$ select 1 where false $$, $$ select 1 where false $$, 'starting with no notification secrets'
);

set local role anon;
select lives_ok(
  $$ insert into public.contacts (full_name, email, message) values ('Quiet', 'quiet@example.com', 'No email configured here.') $$,
  'a contact saves with notifications unconfigured'
);
reset role;

-- Configured, even with an unreachable URL: the insert still succeeds and a
-- request is queued for pg_net to send after commit.
select vault.create_secret('http://127.0.0.1:1/functions/v1/notify-submission', 'notify_submission_url');
select vault.create_secret('test-secret', 'notify_submission_secret');
select is((select count(*)::int from net.http_request_queue where url like '%127.0.0.1:1%'), 0, 'queue starts empty');

set local role anon;
select lives_ok(
  $$ insert into public.contacts (full_name, email, message) values ('Loud', 'loud@example.com', 'Email is configured here.') $$,
  'a contact saves with notifications configured'
);
reset role;

select is(
  (select count(*)::int from net.http_request_queue where url like '%127.0.0.1:1%' and convert_from(body, 'utf8') like '%"contacts"%'),
  1, 'one notification request is queued for the new contact'
);

select * from finish();
rollback;
