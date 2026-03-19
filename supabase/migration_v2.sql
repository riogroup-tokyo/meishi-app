-- Migration v2: Add new columns, customer_connections table, and admin features
-- This migration is idempotent (safe to run multiple times)

-- Add new columns to business_cards
ALTER TABLE business_cards ADD COLUMN IF NOT EXISTS app_number text;
ALTER TABLE business_cards ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE business_cards ADD COLUMN IF NOT EXISTS receipt_name text;
ALTER TABLE business_cards ADD COLUMN IF NOT EXISTS card_number integer;

-- Add is_admin to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Customer connections (知人関係)
CREATE TABLE IF NOT EXISTS customer_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id_1 uuid NOT NULL REFERENCES business_cards(id) ON DELETE CASCADE,
  card_id_2 uuid NOT NULL REFERENCES business_cards(id) ON DELETE CASCADE,
  connection_type text DEFAULT '知人',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(card_id_1, card_id_2),
  CHECK(card_id_1 <> card_id_2)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_connections_card_1 ON customer_connections(card_id_1);
CREATE INDEX IF NOT EXISTS idx_customer_connections_card_2 ON customer_connections(card_id_2);
CREATE INDEX IF NOT EXISTS idx_business_cards_card_number ON business_cards(user_id, card_number);

-- RLS for customer_connections
ALTER TABLE customer_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view connections" ON customer_connections FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert connections" ON customer_connections FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete connections" ON customer_connections FOR DELETE USING (auth.role() = 'authenticated');

-- Admin policies: admins can delete any card and any profile
-- First, create a helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Add admin delete policies for business_cards
DROP POLICY IF EXISTS "Admins can delete any card" ON business_cards;
CREATE POLICY "Admins can delete any card" ON business_cards FOR DELETE USING (is_admin());

-- Add admin delete policy for profiles (not delete own)
DROP POLICY IF EXISTS "Admins can delete any profile" ON profiles;
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE USING (is_admin() AND id <> auth.uid());

-- Add admin select all cards policy (in case they need to manage)
DROP POLICY IF EXISTS "Admins can view all cards" ON business_cards;
CREATE POLICY "Admins can view all cards" ON business_cards FOR SELECT USING (is_admin());
