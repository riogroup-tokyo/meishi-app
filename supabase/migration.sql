-- ============================================================
-- Migration: Add profiles, messages, calendar_events tables
-- Modify business_cards: remove fax, add is_favorite
-- ============================================================

-- Drop fax column if it exists
alter table business_cards drop column if exists fax;

-- Add is_favorite column if it does not exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'business_cards' and column_name = 'is_favorite'
  ) then
    alter table business_cards add column is_favorite boolean not null default false;
  end if;
end $$;

-- ============================================================
-- Create profiles table
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Create messages table
-- ============================================================

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Create calendar_events table
-- ============================================================

create table if not exists calendar_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  card_id uuid references business_cards(id) on delete set null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_messages_created_at on messages(created_at);

create index if not exists idx_calendar_events_start_time on calendar_events(start_time);
create index if not exists idx_calendar_events_end_time on calendar_events(end_time);
create index if not exists idx_calendar_events_user_id on calendar_events(user_id);

-- ============================================================
-- Triggers: updated_at for new tables
-- ============================================================

-- The update_updated_at() function already exists from the original schema.

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at();

drop trigger if exists trg_calendar_events_updated_at on calendar_events;
create trigger trg_calendar_events_updated_at
  before update on calendar_events
  for each row
  execute function update_updated_at();

-- ============================================================
-- Auto-create profile on user signup
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email, 'User'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop and recreate to avoid duplicate trigger errors
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table messages enable row level security;
alter table calendar_events enable row level security;

-- profiles policies
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can view all profiles'
  ) then
    create policy "Users can view all profiles"
      on profiles for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
      on profiles for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

-- messages policies
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'messages' and policyname = 'Authenticated users can view all messages'
  ) then
    create policy "Authenticated users can view all messages"
      on messages for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'messages' and policyname = 'Users can insert their own messages'
  ) then
    create policy "Users can insert their own messages"
      on messages for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- calendar_events policies
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'calendar_events' and policyname = 'Authenticated users can view all events'
  ) then
    create policy "Authenticated users can view all events"
      on calendar_events for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'calendar_events' and policyname = 'Users can insert their own events'
  ) then
    create policy "Users can insert their own events"
      on calendar_events for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'calendar_events' and policyname = 'Users can update their own events'
  ) then
    create policy "Users can update their own events"
      on calendar_events for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'calendar_events' and policyname = 'Users can delete their own events'
  ) then
    create policy "Users can delete their own events"
      on calendar_events for delete
      using (auth.uid() = user_id);
  end if;
end $$;
