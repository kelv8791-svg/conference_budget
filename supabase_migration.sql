-- Apply this migration once to an existing Supabase project.
-- It does not drop conference_data or destroy existing values.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('chef', 'storekeeper')),
  display_name text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.conference_data
  add column if not exists revision bigint not null default 0;

alter table public.conference_data
  add column if not exists updated_by uuid references auth.users(id);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Profiles cannot be self-created" on public.profiles;
create policy "Profiles cannot be self-created"
  on public.profiles for insert
  to authenticated
  with check (false);

drop policy if exists "Profiles cannot be edited by users" on public.profiles;
create policy "Profiles cannot be edited by users"
  on public.profiles for update
  to authenticated
  using (false)
  with check (false);

alter table public.conference_data enable row level security;

drop policy if exists "Allow public read access" on public.conference_data;
drop policy if exists "Allow public update access" on public.conference_data;
drop policy if exists "Allow public insert access" on public.conference_data;
drop policy if exists "Authenticated users can read conference data" on public.conference_data;
drop policy if exists "Authenticated users can update conference data" on public.conference_data;
drop policy if exists "Authenticated users can insert conference data" on public.conference_data;

create policy "Authenticated users can read conference data"
  on public.conference_data for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
    )
  );

create policy "Authenticated users can update conference data"
  on public.conference_data for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
    )
  );

create policy "Authenticated users can insert conference data"
  on public.conference_data for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
    )
  );

create or replace function public.save_conference_state(
  p_expected_revision bigint,
  p_inventory jsonb,
  p_budget jsonb,
  p_issues jsonb
)
returns public.conference_data
language plpgsql
security invoker
as $$
declare
  saved public.conference_data%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'No application role assigned';
  end if;

  select * into saved
  from public.conference_data
  where id = '00000000-0000-0000-0000-000000000001'
  for update;

  if not found then
    insert into public.conference_data (
      id, inventory, budget, issues, updated_by, revision
    ) values (
      '00000000-0000-0000-0000-000000000001',
      coalesce(p_inventory, '[]'::jsonb),
      coalesce(p_budget, '{}'::jsonb),
      coalesce(p_issues, '{}'::jsonb),
      auth.uid(),
      1
    )
    returning * into saved;
  else
    if saved.revision <> p_expected_revision then
      raise exception 'Conflict: this data changed on another device. Refresh and try again.';
    end if;

    update public.conference_data
    set
      inventory = coalesce(p_inventory, '[]'::jsonb),
      budget = coalesce(p_budget, '{}'::jsonb),
      issues = coalesce(p_issues, '{}'::jsonb),
      updated_at = timezone('utc', now()),
      updated_by = auth.uid(),
      revision = saved.revision + 1
    where id = saved.id
    returning * into saved;
  end if;

  return saved;
end;
$$;

revoke all on function public.save_conference_state(bigint, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_conference_state(bigint, jsonb, jsonb, jsonb) to authenticated;
