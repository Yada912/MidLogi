-- ============================================================
-- Kirimin — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── Enable UUID extension ────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ─────────────────────────────────────────────
-- Extends the built-in auth.users table
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  phone         text,
  role          text not null default 'pengirim'
                  check (role in ('pengirim', 'driver', 'admin')),
  avatar        text,
  -- Driver-specific fields
  vehicle_type  text,
  vehicle_plate text,
  vehicle_color text,
  vehicle_max_size text,
  rating        numeric(3,2) default 4.8,
  earnings      numeric default 0,
  -- Location
  location_lat  double precision,
  location_lng  double precision,
  location_name text,
  created_at    timestamptz default now()
);

-- ─── Packages ─────────────────────────────────────────────
create table if not exists public.packages (
  id                 uuid primary key default uuid_generate_v4(),
  owner_id           uuid references public.profiles(id) on delete set null,
  category           text not null,
  weight_size        text not null check (weight_size in ('XS','S','M','L','XL')),
  photo_name         text default '',
  handling           text[] default '{}',
  description        text default '',
  pickup_address     text not null,
  pickup_lat         double precision not null,
  pickup_lng         double precision not null,
  dropoff_address    text not null,
  dropoff_lat        double precision not null,
  dropoff_lng        double precision not null,
  delivery_method    text default 'Bertemu Langsung',
  instruction        text default '',
  delivery_time      text default '',
  status             text not null default 'Draft'
                       check (status in (
                         'Draft','Mencari Driver','Menunggu Pick-up',
                         'Dalam Perjalanan','Telah Tiba','Dibatalkan'
                       )),
  price              integer default 0,
  detour_fee         integer default 0,
  payment_method     text,
  payment_status     text,
  driver_id          uuid references public.profiles(id) on delete set null,
  driver_name        text,
  driver_phone       text,
  driver_avatar      text,
  driver_vehicle     text,
  driver_plate       text,
  bukti_foto         text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger packages_updated_at
  before update on public.packages
  for each row execute function public.touch_updated_at();

-- ─── Driver Routes ────────────────────────────────────────
create table if not exists public.driver_routes (
  driver_id          uuid primary key references public.profiles(id) on delete cascade,
  departure_time     text default '08:00',
  waypoints          jsonb default '[]',
  max_packets        integer default 3,
  max_package_size   text default 'L',
  accepted_categories text[] default '{}',
  active             boolean default false,
  updated_at         timestamptz default now()
);

create trigger driver_routes_updated_at
  before update on public.driver_routes
  for each row execute function public.touch_updated_at();

-- ─── Chat Messages ────────────────────────────────────────
create table if not exists public.chat_messages (
  id           uuid primary key default uuid_generate_v4(),
  package_id   uuid references public.packages(id) on delete cascade,
  sender_id    uuid references public.profiles(id) on delete set null,
  sender_role  text check (sender_role in ('pengirim','driver')),
  text         text not null,
  read         boolean default false,
  created_at   timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.packages      enable row level security;
alter table public.driver_routes enable row level security;
alter table public.chat_messages enable row level security;

-- Helper: check if the caller is admin
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Profiles policies ──────────────────────────────────────
create policy "Profiles: anyone authenticated can read"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Profiles: user can update own"
  on public.profiles for update
  using (id = auth.uid());

create policy "Profiles: insert own on signup"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Profiles: admin full access"
  on public.profiles for all
  using (public.is_admin());

-- ── Packages policies ──────────────────────────────────────
create policy "Packages: authenticated can read all"
  on public.packages for select
  using (auth.role() = 'authenticated');

create policy "Packages: owner can insert"
  on public.packages for insert
  with check (owner_id = auth.uid());

create policy "Packages: owner or driver can update"
  on public.packages for update
  using (owner_id = auth.uid() or driver_id = auth.uid() or public.is_admin());

create policy "Packages: admin full access"
  on public.packages for all
  using (public.is_admin());

-- ── Driver Routes policies ─────────────────────────────────
create policy "Routes: driver owns their route"
  on public.driver_routes for all
  using (driver_id = auth.uid() or public.is_admin());

create policy "Routes: authenticated can read all"
  on public.driver_routes for select
  using (auth.role() = 'authenticated');

-- ── Chat Messages policies ─────────────────────────────────
create policy "Chat: authenticated can read all"
  on public.chat_messages for select
  using (auth.role() = 'authenticated');

create policy "Chat: sender can insert"
  on public.chat_messages for insert
  with check (sender_id = auth.uid());

create policy "Chat: admin full access"
  on public.chat_messages for all
  using (public.is_admin());

-- ─── Realtime ─────────────────────────────────────────────
-- Enable realtime for packages and chat_messages
alter publication supabase_realtime add table public.packages;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.profiles;
