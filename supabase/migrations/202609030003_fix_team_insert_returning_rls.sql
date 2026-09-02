-- INSERT ... RETURNING is evaluated before the AFTER INSERT trigger creates the
-- Owner membership. Let the declared owner read the new row immediately.
drop policy if exists teams_read_members on public.teams;
create policy teams_read_members on public.teams for select to authenticated
  using (
    owner_id = (select auth.uid())
    or public.has_team_membership(id)
  );
