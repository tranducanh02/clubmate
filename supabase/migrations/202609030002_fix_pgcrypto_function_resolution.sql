-- pgcrypto is installed in Supabase's extensions schema. Keep SECURITY DEFINER
-- search paths empty and qualify cryptographic helpers explicitly.

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
