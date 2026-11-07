-- Staff can fix a custom type's name or area, and delete one no program uses
-- (the foreign key from programs refuses the rest). Built-in types stay fixed.
grant update (label, area), delete on public.program_types to authenticated;

create policy "staff update custom program types" on public.program_types
  for update to authenticated
  using ((select public.is_staff()) and not builtin)
  with check ((select public.is_staff()) and not builtin);

create policy "staff delete custom program types" on public.program_types
  for delete to authenticated
  using ((select public.is_staff()) and not builtin);
