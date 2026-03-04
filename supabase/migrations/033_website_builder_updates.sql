-- Adds 'website_build' category to support_ticket_category enum.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_category') THEN
    -- Fallback for fresh DBs: create the enum with existing and new values
    CREATE TYPE support_ticket_category AS ENUM (
      'technical',
      'billing',
      'application',
      'general',
      'website_build'
    );
  ELSE
    -- If enum exists, add the new value if it doesn't already exist
    ALTER TYPE support_ticket_category ADD VALUE IF NOT EXISTS 'website_build';
  END IF;
END
$$;
