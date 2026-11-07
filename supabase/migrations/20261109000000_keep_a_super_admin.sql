-- At least one super admin always remains.
--
-- The change-role and remove-staff Edge Functions refuse to act on the caller,
-- but two super admins demoting or removing each other at the same time would
-- both pass that check and leave none. This trigger closes the race: before a
-- super_admin row loses the role (update) or disappears (delete, including the
-- ON DELETE CASCADE from auth.users), it takes a transaction-scoped advisory
-- lock so such changes run one at a time, then refuses if no other super
-- admin row exists. Under READ COMMITTED the check runs after the lock is
-- granted, so it sees a competing change that has just committed.
--
-- Raises SQLSTATE P0001 with the message 'At least one super admin must remain.'

create function public.keep_a_super_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'super_admin'
     and (tg_op = 'DELETE' or new.role is distinct from 'super_admin') then
    perform pg_advisory_xact_lock(hashtext('public.staff.super_admins'));
    if not exists (
      select 1 from public.staff
      where role = 'super_admin' and user_id <> old.user_id
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'At least one super admin must remain.',
        hint = 'Make someone else a super admin first.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger staff_keep_a_super_admin_update
  before update of role on public.staff
  for each row execute function public.keep_a_super_admin();

create trigger staff_keep_a_super_admin_delete
  before delete on public.staff
  for each row execute function public.keep_a_super_admin();
