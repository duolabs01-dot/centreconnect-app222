-- Extend active trial subscriptions to end of May 2026 (SAST)
-- 31 May 2026 23:59:59.999 SAST = 2026-05-31 21:59:59.999 UTC

update public.subscriptions
set
  trial_ends_at = '2026-05-31T21:59:59.999Z'::timestamptz,
  updated_at = now()
where
  status = 'trial'
  and (
    trial_ends_at is null
    or trial_ends_at < '2026-05-31T21:59:59.999Z'::timestamptz
  );
