create table public.komori_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  profile jsonb not null check (
    jsonb_typeof(profile) = 'object'
    and profile @> '{"schemaVersion":1}'::jsonb
    and octet_length(profile::text) <= 524288
  ),
  updated_at timestamptz not null default now()
);

alter table public.komori_profiles enable row level security;
revoke all on public.komori_profiles from public, anon, authenticated;
grant select on public.komori_profiles to authenticated;
create policy read_own_komori_profile on public.komori_profiles
  for select to authenticated using ((select auth.uid()) = user_id);

-- Clients cannot bypass the revision check with direct table writes.
create function public.save_komori_profile(p_owner uuid, p_expected integer, p_profile jsonb)
returns table (revision integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_owner is distinct from auth.uid() then
    raise exception 'Sign in to update your own profile' using errcode = '42501';
  end if;
  if p_expected is null or p_expected < 0 then
    raise exception 'Invalid expected revision' using errcode = '22023';
  end if;

  if p_expected = 0 then
    return query insert into public.komori_profiles as target (user_id, revision, profile)
      values (p_owner, 1, p_profile)
      on conflict (user_id) do nothing
      returning target.revision;
  else
    return query update public.komori_profiles as target
      set revision = target.revision + 1, profile = p_profile, updated_at = now()
      where target.user_id = p_owner and target.revision = p_expected
      returning target.revision;
  end if;
  -- A retry after a lost response can acknowledge an identical, already saved copy.
  if not found then
    return query select target.revision from public.komori_profiles as target
      where target.user_id = p_owner and target.profile = p_profile;
  end if;
end;
$$;

revoke all on function public.save_komori_profile(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.save_komori_profile(uuid, integer, jsonb) to authenticated;
