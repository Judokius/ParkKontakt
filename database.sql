create extension if not exists pgcrypto;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text,
  model text not null check (char_length(model) between 1 and 80),
  color text not null check (char_length(color) between 1 and 40),
  plate text,
  note text,
  urgent_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.vehicles add column if not exists public_code text;
update public.vehicles
set public_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where public_code is null;
alter table public.vehicles alter column public_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
alter table public.vehicles alter column public_code set not null;
create unique index if not exists vehicles_public_code_idx on public.vehicles(public_code);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  reason text,
  content text not null check (char_length(content) between 8 and 2000),
  is_urgent boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.vehicles enable row level security;
alter table public.messages enable row level security;

create policy "owners can manage their vehicles"
  on public.vehicles for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "anyone can view public vehicle details"
  on public.vehicles for select to anon, authenticated
  using (true);

create policy "anyone can send a vehicle message"
  on public.messages for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.vehicles
      where public.vehicles.id = vehicle_id
    )
  );

create policy "owners can read their vehicle messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.vehicles
      where public.vehicles.id = messages.vehicle_id
        and public.vehicles.owner_id = auth.uid()
    )
  );

create index if not exists vehicles_owner_id_idx on public.vehicles(owner_id);
create index if not exists messages_vehicle_id_idx on public.messages(vehicle_id);
