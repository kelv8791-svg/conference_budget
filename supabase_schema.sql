-- Supabase Setup for Conference Stock Control

-- Initial setup only. This script is safe to re-run and does not delete existing data.

-- 1. Create the shared conference data table
CREATE TABLE IF NOT EXISTS conference_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget jsonb NOT NULL DEFAULT '{}'::jsonb,
  issues jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision bigint NOT NULL DEFAULT 0,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert the shared row only when it is not already present
INSERT INTO conference_data (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 3. Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conference_data'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conference_data;
  END IF;
END;
$$;
