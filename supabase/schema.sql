-- ============================================================
-- meishi-app: Business Card Management Schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- Tables
-- ============================================================

create table if not exists business_cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  image_url text,
  company_name text,
  department text,
  position text,
  person_name text not null,
  person_name_kana text,
  email text,
  phone text,
  mobile_phone text,
  postal_code text,
  address text,
  website text,
  memo text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  name text not null,
  color text not null default '#3b82f6',
  created_at timestamptz not null default now()
);

create table if not exists card_tags (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid not null references business_cards(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (card_id, tag_id)
);

create table if not exists card_relations (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid not null references business_cards(id) on delete cascade,
  related_card_id uuid not null references business_cards(id) on delete cascade,
  relation_type text,
  created_at timestamptz not null default now(),
  unique (card_id, related_card_id),
  check (card_id <> related_card_id)
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

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

-- Foreign key / ownership indexes
create index if not exists idx_business_cards_user_id on business_cards(user_id);
create index if not exists idx_tags_user_id on tags(user_id);
create index if not exists idx_card_tags_card_id on card_tags(card_id);
create index if not exists idx_card_tags_tag_id on card_tags(tag_id);
create index if not exists idx_card_relations_card_id on card_relations(card_id);
create index if not exists idx_card_relations_related_card_id on card_relations(related_card_id);

-- Commonly searched columns
create index if not exists idx_business_cards_company_name on business_cards(company_name);
create index if not exists idx_business_cards_person_name on business_cards(person_name);
create index if not exists idx_business_cards_email on business_cards(email);

-- pg_trgm indexes for fuzzy / ilike search
create index if not exists idx_business_cards_company_name_trgm on business_cards using gin (company_name gin_trgm_ops);
create index if not exists idx_business_cards_person_name_trgm on business_cards using gin (person_name gin_trgm_ops);
create index if not exists idx_business_cards_email_trgm on business_cards using gin (email gin_trgm_ops);
create index if not exists idx_business_cards_memo_trgm on business_cards using gin (memo gin_trgm_ops);

-- Full-text search index (Japanese-friendly with 'simple' config)
create index if not exists idx_business_cards_fts on business_cards using gin (
  to_tsvector('simple',
    coalesce(company_name, '') || ' ' ||
    coalesce(person_name, '') || ' ' ||
    coalesce(department, '') || ' ' ||
    coalesce(position, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(memo, '')
  )
);

-- Messages indexes
create index if not exists idx_messages_created_at on messages(created_at);

-- Calendar events indexes
create index if not exists idx_calendar_events_start_time on calendar_events(start_time);
create index if not exists idx_calendar_events_end_time on calendar_events(end_time);
create index if not exists idx_calendar_events_user_id on calendar_events(user_id);

-- ============================================================
-- updated_at trigger
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_business_cards_updated_at
  before update on business_cards
  for each row
  execute function update_updated_at();

create trigger trg_profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at();

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table business_cards enable row level security;
alter table tags enable row level security;
alter table card_tags enable row level security;
alter table card_relations enable row level security;
alter table profiles enable row level security;
alter table messages enable row level security;
alter table calendar_events enable row level security;

-- business_cards policies
create policy "Users can view their own cards"
  on business_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert their own cards"
  on business_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own cards"
  on business_cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own cards"
  on business_cards for delete
  using (auth.uid() = user_id);

-- tags policies
create policy "Users can view their own tags"
  on tags for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tags"
  on tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tags"
  on tags for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own tags"
  on tags for delete
  using (auth.uid() = user_id);

-- card_tags policies (access via card ownership)
create policy "Users can view their own card_tags"
  on card_tags for select
  using (
    exists (
      select 1 from business_cards
      where business_cards.id = card_tags.card_id
        and business_cards.user_id = auth.uid()
    )
  );

create policy "Users can insert their own card_tags"
  on card_tags for insert
  with check (
    exists (
      select 1 from business_cards
      where business_cards.id = card_tags.card_id
        and business_cards.user_id = auth.uid()
    )
  );

create policy "Users can delete their own card_tags"
  on card_tags for delete
  using (
    exists (
      select 1 from business_cards
      where business_cards.id = card_tags.card_id
        and business_cards.user_id = auth.uid()
    )
  );

-- card_relations policies (access via card ownership)
create policy "Users can view their own card_relations"
  on card_relations for select
  using (
    exists (
      select 1 from business_cards
      where business_cards.id = card_relations.card_id
        and business_cards.user_id = auth.uid()
    )
  );

create policy "Users can insert their own card_relations"
  on card_relations for insert
  with check (
    exists (
      select 1 from business_cards
      where business_cards.id = card_relations.card_id
        and business_cards.user_id = auth.uid()
    )
  );

create policy "Users can delete their own card_relations"
  on card_relations for delete
  using (
    exists (
      select 1 from business_cards
      where business_cards.id = card_relations.card_id
        and business_cards.user_id = auth.uid()
    )
  );

-- profiles policies
create policy "Users can view all profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- messages policies
create policy "Authenticated users can view all messages"
  on messages for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own messages"
  on messages for insert
  with check (auth.uid() = user_id);

-- calendar_events policies
create policy "Authenticated users can view all events"
  on calendar_events for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own events"
  on calendar_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own events"
  on calendar_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own events"
  on calendar_events for delete
  using (auth.uid() = user_id);
