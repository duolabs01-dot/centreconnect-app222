-- Parent portal performance indexes.
-- Improves dashboard/application list scans and activity feed joins.

CREATE INDEX IF NOT EXISTS idx_applications_parent_submitted_desc
  ON public.applications(parent_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_parent_status
  ON public.applications(parent_id, status);

CREATE INDEX IF NOT EXISTS idx_app_history_created_application
  ON public.application_status_history(created_at DESC, application_id);
