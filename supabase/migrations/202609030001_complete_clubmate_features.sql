-- Complete ClubMate workflows: invitations, ghost claims, safe RSVP/billing and media.

alter table public.team_members
  add column if not exists claim_code_expires_at timestamptz,
  add column if not exists archived_at timestamptz;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'active'
      and tm.archived_at is null
  );
$$;

create or replace function public.is_team_owner(target_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = (select auth.uid())
      and tm.role = 'owner'
      and tm.status = 'active'
      and tm.archived_at is null
  );
$$;

create or replace function public.has_team_membership(target_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = (select auth.uid())
      and tm.archived_at is null
  );
$$;

create or replace function public.shares_team_with(target_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members mine
    join public.team_members theirs on theirs.team_id = mine.team_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and mine.archived_at is null
      and theirs.user_id = target_user_id
      and theirs.status = 'active'
      and theirs.archived_at is null
  );
$$;

revoke all on function public.has_team_membership(uuid) from public;
revoke all on function public.shares_team_with(uuid) from public;
grant execute on function public.has_team_membership(uuid) to authenticated;
grant execute on function public.shares_team_with(uuid) to authenticated;

drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self_or_teammate on public.profiles for select to authenticated
  using ((select auth.uid()) = id or public.shares_team_with(id));

drop policy if exists teams_read_members on public.teams;
create policy teams_read_members on public.teams for select to authenticated
  using (public.has_team_membership(id));

create policy team_members_read_self on public.team_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy team_members_leave_self on public.team_members for delete to authenticated
  using (user_id = (select auth.uid()) and role = 'member');

create or replace function public.join_team(p_invite_code text)
returns table(team_id uuid, membership_status public.membership_status)
language plpgsql security definer set search_path = ''
as $$
declare
  target_team public.teams%rowtype;
  viewer public.profiles%rowtype;
  existing public.team_members%rowtype;
begin
  select * into target_team
  from public.teams t
  where t.invite_code = upper(trim(p_invite_code));

  if target_team.id is null then
    raise exception 'Mã mời không hợp lệ';
  end if;

  select * into viewer from public.profiles p where p.id = (select auth.uid());
  if viewer.id is null then raise exception 'Không tìm thấy hồ sơ'; end if;

  select * into existing from public.team_members tm
  where tm.team_id = target_team.id and tm.user_id = viewer.id;

  if existing.id is not null then
    if existing.archived_at is not null then
      update public.team_members
      set archived_at = null,
          status = case when target_team.auto_approve then 'active'::public.membership_status else 'pending'::public.membership_status end,
          display_name = viewer.full_name,
          gender = viewer.gender
      where id = existing.id
      returning public.team_members.status into existing.status;
    end if;
    return query select existing.team_id, existing.status;
    return;
  end if;

  insert into public.team_members(team_id, user_id, display_name, gender, role, status)
  values (
    target_team.id,
    viewer.id,
    viewer.full_name,
    viewer.gender,
    'member',
    case when target_team.auto_approve then 'active'::public.membership_status else 'pending'::public.membership_status end
  )
  returning public.team_members.team_id, public.team_members.status
  into team_id, membership_status;
  return next;
end;
$$;

create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.team_members
  set archived_at = now()
  where team_id = p_team_id
    and user_id = (select auth.uid())
    and role = 'member'
    and archived_at is null;
  if not found then raise exception 'Không thể rời đội này'; end if;
end;
$$;

create or replace function public.create_member_claim_code(p_member_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  member_row public.team_members%rowtype;
  raw_code text;
begin
  select * into member_row from public.team_members where id = p_member_id;
  if member_row.id is null or not public.is_team_owner(member_row.team_id) then
    raise exception 'Bạn không có quyền tạo mã nhận';
  end if;
  if member_row.user_id is not null then raise exception 'Thành viên đã có tài khoản'; end if;

  raw_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  update public.team_members
  set claim_code_hash = encode(extensions.digest(raw_code, 'sha256'), 'hex'),
      claim_code_expires_at = now() + interval '7 days'
  where id = p_member_id;
  return raw_code;
end;
$$;

create or replace function public.claim_member(p_claim_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  member_row public.team_members%rowtype;
  viewer public.profiles%rowtype;
begin
  select * into member_row
  from public.team_members tm
  where tm.claim_code_hash = encode(extensions.digest(upper(trim(p_claim_code)), 'sha256'), 'hex')
    and tm.user_id is null
    and tm.claim_code_expires_at > now()
  limit 1;
  if member_row.id is null then raise exception 'Mã nhận không hợp lệ hoặc đã hết hạn'; end if;

  select * into viewer from public.profiles p where p.id = (select auth.uid());
  if viewer.gender <> member_row.gender then
    raise exception 'Giới tính tài khoản không khớp hồ sơ thành viên';
  end if;
  if exists (
    select 1 from public.team_members tm
    where tm.team_id = member_row.team_id and tm.user_id = viewer.id
  ) then
    raise exception 'Tài khoản đã là thành viên của đội này';
  end if;

  update public.team_members
  set user_id = viewer.id,
      display_name = viewer.full_name,
      claim_code_hash = null,
      claim_code_expires_at = null,
      status = 'active'
  where id = member_row.id;
  return member_row.team_id;
end;
$$;

create or replace function public.rotate_team_invite_code(p_team_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare new_code text;
begin
  if not public.is_team_owner(p_team_id) then raise exception 'Chỉ Owner có quyền đổi mã mời'; end if;
  loop
    new_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (select 1 from public.teams where invite_code = new_code);
  end loop;
  update public.teams set invite_code = new_code, updated_at = now() where id = p_team_id;
  return new_code;
end;
$$;

drop policy if exists participants_insert_team on public.session_participants;
drop policy if exists participants_update_team on public.session_participants;

create policy participants_insert_owner on public.session_participants for insert to authenticated
  with check (public.is_team_owner((select s.team_id from public.play_sessions s where s.id = session_id)));
create policy participants_update_owner on public.session_participants for update to authenticated
  using (public.is_team_owner((select s.team_id from public.play_sessions s where s.id = session_id)))
  with check (public.is_team_owner((select s.team_id from public.play_sessions s where s.id = session_id)));

create or replace function public.rsvp_session(p_session_id uuid, p_status public.rsvp_status)
returns void
language plpgsql security definer set search_path = ''
as $$
declare viewer_member_id uuid;
begin
  select tm.id into viewer_member_id
  from public.team_members tm
  join public.play_sessions s on s.team_id = tm.team_id
  where s.id = p_session_id
    and tm.user_id = (select auth.uid())
    and tm.status = 'active';
  if viewer_member_id is null then raise exception 'Bạn không thuộc đội này'; end if;
  if exists (select 1 from public.play_sessions s where s.id = p_session_id and s.finalized_at is not null) then
    raise exception 'Buổi chơi đã chốt';
  end if;

  insert into public.session_participants(session_id, member_id, rsvp)
  values (p_session_id, viewer_member_id, p_status)
  on conflict (session_id, member_id) where member_id is not null
  do update set rsvp = excluded.rsvp;
end;
$$;

create or replace function public.finalize_session_costs(
  p_session_id uuid,
  p_court_cost integer,
  p_shuttle_cost integer,
  p_male_factor numeric
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target_team_id uuid;
  male_count integer;
  female_count integer;
  total_count integer;
  weight_total numeric;
begin
  select team_id into target_team_id from public.play_sessions where id = p_session_id;
  if target_team_id is null or not public.is_team_owner(target_team_id) then
    raise exception 'Chỉ Owner có quyền chốt chi phí';
  end if;
  if p_court_cost < 0 or p_shuttle_cost < 0 or p_male_factor not in (1, 1.5, 2) then
    raise exception 'Chi phí hoặc hệ số không hợp lệ';
  end if;

  select
    count(*) filter (where coalesce(tm.gender, sp.guest_gender) = 'male'),
    count(*) filter (where coalesce(tm.gender, sp.guest_gender) = 'female')
  into male_count, female_count
  from public.session_participants sp
  left join public.team_members tm on tm.id = sp.member_id
  where sp.session_id = p_session_id and sp.attended;

  total_count := male_count + female_count;
  if total_count = 0 then raise exception 'Cần điểm danh ít nhất một người'; end if;
  weight_total := male_count * p_male_factor + female_count;

  update public.session_participants sp
  set amount_due = case
    when not sp.attended then null
    when coalesce(tm.gender, sp.guest_gender) = 'male' then
      (ceil(((p_court_cost::numeric / total_count) + (p_shuttle_cost::numeric * p_male_factor / weight_total)) / 1000) * 1000)::integer
    else
      (ceil(((p_court_cost::numeric / total_count) + (p_shuttle_cost::numeric / weight_total)) / 1000) * 1000)::integer
  end
  from public.team_members tm
  where sp.session_id = p_session_id
    and sp.member_id = tm.id;

  -- Guests do not join team_members, so update them separately.
  update public.session_participants sp
  set amount_due = case
    when not sp.attended then null
    when sp.guest_gender = 'male' then
      (ceil(((p_court_cost::numeric / total_count) + (p_shuttle_cost::numeric * p_male_factor / weight_total)) / 1000) * 1000)::integer
    else
      (ceil(((p_court_cost::numeric / total_count) + (p_shuttle_cost::numeric / weight_total)) / 1000) * 1000)::integer
  end
  where sp.session_id = p_session_id and sp.member_id is null;

  insert into public.session_costs(session_id, court_cost, shuttle_cost, male_factor, saved_by, saved_at)
  values (p_session_id, p_court_cost, p_shuttle_cost, p_male_factor, (select auth.uid()), now())
  on conflict (session_id) do update
  set court_cost = excluded.court_cost,
      shuttle_cost = excluded.shuttle_cost,
      male_factor = excluded.male_factor,
      saved_by = excluded.saved_by,
      saved_at = now();

  update public.play_sessions set finalized_at = now() where id = p_session_id;
end;
$$;

revoke all on function public.join_team(text) from public;
revoke all on function public.leave_team(uuid) from public;
revoke all on function public.create_member_claim_code(uuid) from public;
revoke all on function public.claim_member(text) from public;
revoke all on function public.rotate_team_invite_code(uuid) from public;
revoke all on function public.rsvp_session(uuid, public.rsvp_status) from public;
revoke all on function public.finalize_session_costs(uuid, integer, integer, numeric) from public;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
grant execute on function public.create_member_claim_code(uuid) to authenticated;
grant execute on function public.claim_member(text) to authenticated;
grant execute on function public.rotate_team_invite_code(uuid) to authenticated;
grant execute on function public.rsvp_session(uuid, public.rsvp_status) to authenticated;
grant execute on function public.finalize_session_costs(uuid, integer, integer, numeric) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
       ('team-media', 'team-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy avatar_upload_self on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatar_update_self on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner_id = (select auth.uid()::text));
create policy avatar_delete_self on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner_id = (select auth.uid()::text));

create policy team_media_upload_owner on storage.objects for insert to authenticated
  with check (
    bucket_id = 'team-media'
    and public.is_team_owner(((storage.foldername(name))[1])::uuid)
  );
create policy team_media_update_owner on storage.objects for update to authenticated
  using (
    bucket_id = 'team-media'
    and public.is_team_owner(((storage.foldername(name))[1])::uuid)
  );
create policy team_media_delete_owner on storage.objects for delete to authenticated
  using (
    bucket_id = 'team-media'
    and public.is_team_owner(((storage.foldername(name))[1])::uuid)
  );
