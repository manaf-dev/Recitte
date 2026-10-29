-- After a submission is committed, ask the notify-submission Edge Function to
-- email staff and the visitor. pg_net queues the request asynchronously, so
-- the visitor's insert never waits on, or fails because of, email.
--
-- Configure per environment with Vault (see README):
--   select vault.create_secret('<functions url>/notify-submission', 'notify_submission_url');
--   select vault.create_secret('<random secret>', 'notify_submission_secret');
-- Without both secrets the trigger does nothing and submissions still save.

create extension if not exists pg_net with schema extensions;

create function public.queue_submission_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_url text;
  shared_secret text;
begin
  begin
    select decrypted_secret into target_url from vault.decrypted_secrets where name = 'notify_submission_url';
    select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'notify_submission_secret';
    if target_url is null or shared_secret is null then
      return new;
    end if;
    perform net.http_post(
      url := target_url,
      body := jsonb_build_object('table', tg_table_name, 'id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', shared_secret),
      timeout_milliseconds := 10000
    );
  exception when others then
    -- Never let email plumbing undo a submission.
    raise warning 'queue_submission_notification skipped for % %: %', tg_table_name, new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke execute on function public.queue_submission_notification() from public, anon, authenticated, service_role;

create trigger applications_notify after insert on public.applications
  for each row execute function public.queue_submission_notification();
create trigger registrations_notify after insert on public.registrations
  for each row execute function public.queue_submission_notification();
create trigger contacts_notify after insert on public.contacts
  for each row execute function public.queue_submission_notification();
