-- Supabase Setup for Conference Stock Control

-- 0. Clean reset (Only run if you are setting up or fixing schema)
DROP TABLE IF EXISTS conference_data CASCADE;

-- 1. Create a table to store the conference data
CREATE TABLE conference_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget jsonb NOT NULL DEFAULT '{}'::jsonb,
  issues jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert a single default row
INSERT INTO conference_data (id) VALUES ('00000000-0000-0000-0000-000000000001');

-- 3. Enable Row Level Security (RLS) but allow anonymous access for demo
ALTER TABLE conference_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON conference_data
  FOR SELECT USING (true);

CREATE POLICY "Allow public update access" ON conference_data
  FOR UPDATE USING (true);

CREATE POLICY "Allow public insert access" ON conference_data
  FOR INSERT WITH CHECK (true);

-- 4. Enable Realtime on the table to sync data across devices instantly!
alter publication supabase_realtime add table conference_data;
