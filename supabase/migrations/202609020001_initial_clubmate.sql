-- ClubMate initial multi-tenant schema for Supabase/Postgres.
create extension if not exists pgcrypto;

create type public.gender_type as enum ('male', 'female');
create type public.team_role as enum ('owner', 'member');
create type public.membership_status as enum ('pending', 'active');
create type public.sport_type as enum ('badminton', 'pickleball');
create type public.rsvp_status as enum ('going', 'not_going');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 100),
  gender public.gender_type not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text,
  cover_url text,
  invite_code text not null default upper(substr(md5(random()::text), 1, 6)) unique,
  auto_approve boolean not null default true,
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 100),
  gender public.gender_type not null,
  role public.team_role not null default 'member',
  status public.membership_status not null default 'active',
  claim_code_hash text,
  joined_at timestamptz not null default now()
);

create unique index team_members_user_team_unique
  on public.team_members(team_id, user_id) where user_id is not null;
create index team_members_user_id_idx on public.team_members(user_id);
create index team_members_team_id_idx on public.team_members(team_id);

create table public.play_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  sport public.sport_type not null,
  title text not null,
  starts_at timestamptz not null,
  location text not null,
  max_slots integer check (max_slots is null or max_slots >= 2),
  image_url text,
  created_by uuid not null references public.profiles(id),
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);
create index play_sessions_team_start_idx on public.play_sessions(team_id, starts_at);

create table public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.play_sessions(id) on delete cascade,
  member_id uuid references public.team_members(id) on delete cascade,
  guest_name text,
  guest_gender public.gender_type,
  rsvp public.rsvp_status,
  attended boolean not null default false,
  amount_due integer check (amount_due is null or amount_due >= 0),
  created_at timestamptz not null default now(),
  constraint participant_identity_check check (
    (member_id is not null and guest_name is null and guest_gender is null)
    or (member_id is null and guest_name is not null and guest_gender is not null)
  )
);
create unique index session_member_unique
  on public.session_participants(session_id, member_id) where member_id is not null;

create table public.session_costs (
  session_id uuid primary key references public.play_sessions(id) on delete cascade,
  court_cost integer not null default 0 check (court_cost >= 0),
  shuttle_cost integer not null default 0 check (shuttle_cost >= 0),
  male_factor numeric(2,1) not null default 2 check (male_factor in (1, 1.5, 2)),
  saved_by uuid not null references public.profiles(id),
  saved_at timestamptz not null default now()
);

create table public.monthly_payments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  month date not null check (month = date_trunc('month', month)::date),
  amount integer not null default 0 check (amount >= 0),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique(team_id, member_id, month)
);
create index monthly_payments_team_month_idx on public.monthly_payments(team_id, month);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text not null,
  content text not null,
  youtube_url text,
  created_at timestamptz not null default now()
);

create table public.announcement_comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

-- Copy immutable billing identity from sign-up metadata into a protected profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, gender)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    (new.raw_user_meta_data ->> 'gender')::public.gender_type
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.prevent_gender_change()
returns trigger language plpgsql as $$
begin
  if old.gender is distinct from new.gender then
    raise exception 'Gender cannot be changed after registration';
  end if;
  return new;
end;
$$;

create trigger profiles_gender_immutable
  before update on public.profiles
  for each row execute procedure public.prevent_gender_change();

create or replace function public.add_team_owner_membership()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.team_members(team_id, user_id, display_name, gender, role, status)
  select new.id, new.owner_id, p.full_name, p.gender, 'owner', 'active'
  from public.profiles p where p.id = new.owner_id;
  return new;
end;
$$;

create trigger on_team_created
  after insert on public.teams
  for each row execute procedure public.add_team_owner_membership();

-- SECURITY DEFINER helpers avoid recursive policies on team_members.
create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = (select auth.uid())
      and tm.status = 'active'
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
  );
$$;

revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.is_team_owner(uuid) from public;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_owner(uuid) to authenticated;

revoke all on table public.profiles, public.teams, public.team_members,
  public.play_sessions, public.session_participants, public.session_costs,
  public.monthly_payments, public.announcements, public.announcement_comments
  from anon;
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.teams, public.team_members,
  public.play_sessions, public.session_participants, public.session_costs,
  public.monthly_payments, public.announcements, public.announcement_comments
  to authenticated;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.play_sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.session_costs enable row level security;
alter table public.monthly_payments enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_comments enable row level security;

create policy profiles_read_self on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy teams_read_members on public.teams for select to authenticated
  using (public.is_team_member(id));
create policy teams_create_authenticated on public.teams for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy teams_update_owner on public.teams for update to authenticated
  using (public.is_team_owner(id)) with check (public.is_team_owner(id));
create policy teams_delete_owner on public.teams for delete to authenticated
  using (public.is_team_owner(id));

create policy team_members_read_team on public.team_members for select to authenticated
  using (public.is_team_member(team_id));
create policy team_members_insert_owner on public.team_members for insert to authenticated
  with check (public.is_team_owner(team_id));
create policy team_members_update_owner on public.team_members for update to authenticated
  using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id));
create policy team_members_delete_owner on public.team_members for delete to authenticated
  using (public.is_team_owner(team_id));

create policy sessions_read_team on public.play_sessions for select to authenticated
  using (public.is_team_member(team_id));
create policy sessions_insert_owner on public.play_sessions for insert to authenticated
  with check (public.is_team_owner(team_id) and created_by = (select auth.uid()));
create policy sessions_update_owner on public.play_sessions for update to authenticated
  using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id));
create policy sessions_delete_owner on public.play_sessions for delete to authenticated
  using (public.is_team_owner(team_id));

create policy participants_read_team on public.session_participants for select to authenticated
  using (public.is_team_member((select s.team_id from public.play_sessions s where s.id = session_id)));
create policy participants_insert_team on public.session_participants for insert to authenticated
  with check (
    public.is_team_owner((select s.team_id from public.play_sessions s where s.id = session_id))
    or member_id in (
      select tm.id from public.team_members tm
      where tm.user_id = (select auth.uid()) and tm.status = 'active'
    )
  );
create policy participants_update_team on public.session_participants for update to authenticated
  using (
    public.is_team_owner((select s.team_id from public.play_sessions s where s.id = session_id))
    or member_id in (
      select tm.id from public.team_members tm
      where tm.user_id = (select auth.uid()) and tm.status = 'active'
    )
  )
  with check (
    public.is_team_owner((select s.team_id from public.play_sessions s where s.id = session_id))
    or member_id in (
      select tm.id from public.team_members tm
      where tm.user_id = (select auth.uid()) and tm.status = 'active'
    )
  );
create policy participants_delete_owner on public.session_participants for delete to authenticated
  using (public.is_team_owner((select s.team_id from public.play_sessions s where s.id = session_id)));

create policy costs_read_team on public.session_costs for select to authenticated
  using (public.is_team_member((select s.team_id from public.play_sessions s where s.id = session_id)));
create policy costs_manage_owner on public.session_costs for all to authenticated
  using (public.is_team_owner((select s.team_id from public.play_sessions s where s.id = session_id)))
  with check (public.is_team_owner((select s.team_id from public.play_sessions s where s.id = session_id)));

create policy payments_read_team on public.monthly_payments for select to authenticated
  using (public.is_team_member(team_id));
create policy payments_manage_owner on public.monthly_payments for all to authenticated
  using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id));

create policy announcements_read_team on public.announcements for select to authenticated
  using (public.is_team_member(team_id));
create policy announcements_manage_owner on public.announcements for all to authenticated
  using (public.is_team_owner(team_id))
  with check (public.is_team_owner(team_id) and author_id = (select auth.uid()));

create policy comments_read_team on public.announcement_comments for select to authenticated
  using (public.is_team_member((select a.team_id from public.announcements a where a.id = announcement_id)));
create policy comments_create_member on public.announcement_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_team_member((select a.team_id from public.announcements a where a.id = announcement_id))
  );
create policy comments_update_self on public.announcement_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy comments_delete_self_or_owner on public.announcement_comments for delete to authenticated
  using (
    author_id = (select auth.uid())
    or public.is_team_owner((select a.team_id from public.announcements a where a.id = announcement_id))
  );
