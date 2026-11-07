-- Staff first and last names.
--
-- Nullable so rows from before this migration survive; invite-staff requires
-- both for every new invite. A name, when present, is already trimmed and
-- 1 to 80 characters long.
--
-- No grant or policy changes: `grant select on public.staff to authenticated`
-- is table-level, so it covers these columns, and staff rows are still written
-- only by Edge Functions holding the service role.

alter table public.staff
  add column first_name text
    constraint staff_first_name_check check (first_name = btrim(first_name) and char_length(first_name) between 1 and 80),
  add column last_name text
    constraint staff_last_name_check check (last_name = btrim(last_name) and char_length(last_name) between 1 and 80);
