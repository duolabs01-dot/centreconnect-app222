-- Move multiple-application signal to 3+ active applications per parent + child.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS share_multiple_flag BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS multiple_threshold_reached BOOLEAN NOT NULL DEFAULT FALSE;

-- Replace previous trigger logic (2+) with 3+ threshold logic.
DROP TRIGGER IF EXISTS applications_set_applied_multiple_on_insert ON applications;
DROP FUNCTION IF EXISTS set_applied_multiple_on_insert();

CREATE OR REPLACE FUNCTION set_multiple_threshold_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INTEGER := 0;
BEGIN
  IF NEW.status IN ('submitted', 'in_review', 'waitlisted') THEN
    SELECT COUNT(*) INTO active_count
    FROM applications a
    WHERE a.parent_id = NEW.parent_id
      AND a.child_id = NEW.child_id
      AND a.status IN ('submitted', 'in_review', 'waitlisted');

    IF active_count >= 3 THEN
      UPDATE applications
      SET multiple_threshold_reached = TRUE
      WHERE parent_id = NEW.parent_id
        AND child_id = NEW.child_id
        AND status IN ('submitted', 'in_review', 'waitlisted');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_set_multiple_threshold_on_insert
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION set_multiple_threshold_on_insert();

-- Backfill consistency for active rows only.
UPDATE applications a
SET multiple_threshold_reached = (
  EXISTS (
    SELECT 1
    FROM applications b
    WHERE b.parent_id = a.parent_id
      AND b.child_id = a.child_id
      AND b.status IN ('submitted', 'in_review', 'waitlisted')
    GROUP BY b.parent_id, b.child_id
    HAVING COUNT(*) >= 3
  )
)
WHERE a.status IN ('submitted', 'in_review', 'waitlisted');

