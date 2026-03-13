-- Child Identity Fingerprint System
-- Prevents duplicate applications for same child at same ECD

-- 1. Child identities table - stores anonymized fingerprints for matching
CREATE TABLE IF NOT EXISTS child_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  child_name_hash TEXT NOT NULL,        -- Hash of: lowercase(trim(first_name || last_name))
  dob_hash TEXT NOT NULL,               -- Hash of: DOB string
  gender_hash TEXT NOT NULL,            -- Hash of: lowercase(gender)
  suburb_hash TEXT NOT NULL,            -- Hash of: lowercase(trim(suburb))
  
  original_parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  original_child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  original_application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  
  match_count INT DEFAULT 1,             -- How many similar records found
  verified_by_ecd BOOLEAN DEFAULT FALSE, -- ECD confirmed this is not a duplicate
  ecd_verified_at TIMESTAMPTZ,
  ecd_verified_by UUID REFERENCES ecd_admins(user_id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_child_identity UNIQUE (ecd_id, child_name_hash, dob_hash, gender_hash)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_child_identities_ecd ON child_identities(ecd_id);
CREATE INDEX IF NOT EXISTS idx_child_identities_hashes ON child_identities(ecd_id, child_name_hash, dob_hash);

-- 2. Family link requests - for manual ECD-initiated linking
CREATE TABLE IF NOT EXISTS family_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  ecd_id UUID NOT NULL REFERENCES ecd_centres(id) ON DELETE CASCADE,
  requested_by_ecd_admin_id UUID REFERENCES ecd_admins(user_id) ON DELETE SET NULL,
  
  parent_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  reason TEXT, -- "Same family - paper forms from both parents", "Duplicate application", etc.
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- If parents approve themselves later
  parent_a_approved_at TIMESTAMPTZ,
  parent_b_approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  CONSTRAINT unique_family_link UNIQUE (parent_a_id, parent_b_id)
);

CREATE INDEX IF NOT EXISTS idx_family_link_requests_ecd ON family_link_requests(ecd_id);
CREATE INDEX IF NOT EXISTS idx_family_link_requests_parent ON family_link_requests(parent_a_id, parent_b_id);

-- 3. Add application link field for merged children
ALTER TABLE applications ADD COLUMN IF NOT EXISTS merged_from_parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS linked_sibling_application_id UUID REFERENCES applications(id) ON DELETE SET NULL;

-- 4. Add tracking for account merges
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS merged_into_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;

-- Function to generate child fingerprint
CREATE OR REPLACE FUNCTION generate_child_fingerprint(
  p_first_name TEXT,
  p_last_name TEXT,
  p_dob DATE,
  p_gender TEXT,
  p_suburb TEXT
)
RETURNS TABLE(child_name_hash TEXT, dob_hash TEXT, gender_hash TEXT, suburb_hash TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Normalize: lowercase, trim, remove spaces for hashing
    LOWER(TRIM(CONCAT(p_first_name, p_last_name)))::TEXT AS child_name_hash,
    p_dob::TEXT AS dob_hash,
    LOWER(TRIM(p_gender))::TEXT AS gender_hash,
    LOWER(TRIM(p_suburb))::TEXT AS suburb_hash;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check potential duplicates when applying
CREATE OR REPLACE FUNCTION check_child_identity_duplicates(
  p_ecd_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_dob DATE,
  p_gender TEXT,
  p_suburb TEXT,
  p_exclude_parent_id UUID DEFAULT NULL
)
RETURNS TABLE(
  identity_id UUID,
  original_parent_id UUID,
  original_child_id UUID,
  original_application_id UUID,
  match_fields TEXT[],
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_child_name_hash TEXT;
  v_dob_hash TEXT;
  v_gender_hash TEXT;
  v_suburb_hash TEXT;
BEGIN
  -- Generate hashes from input
  SELECT f.child_name_hash, f.dob_hash, f.gender_hash, f.suburb_hash
  INTO v_child_name_hash, v_dob_hash, v_gender_hash, v_suburb_hash
  FROM generate_child_fingerprint(p_first_name, p_last_name, p_dob, p_gender, p_suburb) f;

  -- Find matches with at least 2 field matches
  RETURN QUERY
  SELECT 
    ci.id,
    ci.original_parent_id,
    ci.original_child_id,
    ci.original_application_id,
    CASE 
      WHEN ci.child_name_hash = v_child_name_hash AND ci.dob_hash = v_dob_hash::TEXT THEN ARRAY['name', 'dob']
      WHEN ci.child_name_hash = v_child_name_hash AND ci.gender_hash = v_gender_hash THEN ARRAY['name', 'gender']
      WHEN ci.dob_hash = v_dob_hash::TEXT AND ci.gender_hash = v_gender_hash THEN ARRAY['dob', 'gender']
      WHEN ci.child_name_hash = v_child_name_hash AND ci.suburb_hash = v_suburb_hash THEN ARRAY['name', 'suburb']
      ELSE ARRAY['name']
    END AS match_fields,
    ci.created_at
  FROM child_identities ci
  WHERE ci.ecd_id = p_ecd_id
    AND (
      (ci.child_name_hash = v_child_name_hash AND ci.dob_hash = v_dob_hash::TEXT)
      OR (ci.child_name_hash = v_child_name_hash AND ci.gender_hash = v_gender_hash)
      OR (ci.dob_hash = v_dob_hash::TEXT AND ci.gender_hash = v_gender_hash)
      OR (ci.child_name_hash = v_child_name_hash AND ci.suburb_hash = v_suburb_hash)
    )
    AND (p_exclude_parent_id IS NULL OR ci.original_parent_id != p_exclude_parent_id)
  ORDER BY ci.match_count DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Function to record child identity after application
CREATE OR REPLACE FUNCTION record_child_identity(
  p_ecd_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_dob DATE,
  p_gender TEXT,
  p_suburb TEXT,
  p_parent_id UUID,
  p_child_id UUID,
  p_application_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_identity_id UUID;
  v_child_name_hash TEXT;
  v_dob_hash TEXT;
  v_gender_hash TEXT;
  v_suburb_hash TEXT;
BEGIN
  SELECT f.child_name_hash, f.dob_hash, f.gender_hash, f.suburb_hash
  INTO v_child_name_hash, v_dob_hash, v_gender_hash, v_suburb_hash
  FROM generate_child_fingerprint(p_first_name, p_last_name, p_dob, p_gender, p_suburb) f;

  -- Try to insert, or update if exists
  INSERT INTO child_identities (
    ecd_id, child_name_hash, dob_hash, gender_hash, suburb_hash,
    original_parent_id, original_child_id, original_application_id,
    match_count, created_at, updated_at
  ) VALUES (
    p_ecd_id, v_child_name_hash, v_dob_hash, v_gender_hash, v_suburb_hash,
    p_parent_id, p_child_id, p_application_id,
    1, NOW(), NOW()
  )
  ON CONFLICT (ecd_id, child_name_hash, dob_hash, gender_hash) 
  DO UPDATE SET 
    match_count = child_identities.match_count + 1,
    updated_at = NOW()
  RETURNING id INTO v_identity_id;

  RETURN v_identity_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON child_identities TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON child_identities TO service_role;
GRANT SELECT ON family_link_requests TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON family_link_requests TO service_role;
GRANT EXECUTE ON FUNCTION generate_child_fingerprint TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_child_identity_duplicates TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_child_identity TO authenticated, service_role;
