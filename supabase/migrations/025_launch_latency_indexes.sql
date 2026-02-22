-- Launch latency pass:
-- Adds composite indexes for high-frequency ECD portal reads.

-- Announcements list and draft filter per tenant.
CREATE INDEX IF NOT EXISTS idx_announcements_ecd_created_desc
  ON public.announcements(ecd_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_ecd_published_created_desc
  ON public.announcements(ecd_id, is_published, created_at DESC);

-- Marketplace request history per tenant.
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_ecd_created_desc
  ON public.ecd_marketplace_orders(ecd_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_ecd_status_created_desc
  ON public.ecd_marketplace_orders(ecd_id, status, created_at DESC);

-- Message thread lookup for direct conversations in ECD communications.
CREATE INDEX IF NOT EXISTS idx_message_threads_ecd_context_created_desc
  ON public.message_threads(ecd_id, context_type, context_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_threads_participants_gin
  ON public.message_threads USING gin(participant_ids);
