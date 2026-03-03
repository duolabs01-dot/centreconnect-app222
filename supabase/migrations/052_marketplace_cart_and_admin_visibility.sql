-- Marketplace cart flow + request visibility hardening.
-- 1) Allow "cart" as an order status.
-- 2) Allow ECD admins to move their own orders from cart -> requested.
-- 3) Prevent duplicate open orders for the same service.

ALTER TABLE public.ecd_marketplace_orders
  DROP CONSTRAINT IF EXISTS ecd_marketplace_orders_status_check;

ALTER TABLE public.ecd_marketplace_orders
  ADD CONSTRAINT ecd_marketplace_orders_status_check
  CHECK (status IN ('cart', 'requested', 'paid', 'fulfilled', 'cancelled'));

DROP POLICY IF EXISTS "marketplace_orders_update_platform_only" ON public.ecd_marketplace_orders;
DROP POLICY IF EXISTS "marketplace_orders_update_strict" ON public.ecd_marketplace_orders;

CREATE POLICY "marketplace_orders_update_strict" ON public.ecd_marketplace_orders
  FOR UPDATE
  USING (
    is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  )
  WITH CHECK (
    is_platform_admin()
    OR user_is_ecd_admin(ecd_id)
  );

WITH ranked_open_orders AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY ecd_id, service_id
      ORDER BY created_at DESC, id DESC
    ) AS row_rank
  FROM public.ecd_marketplace_orders
  WHERE status IN ('cart', 'requested', 'paid')
)
UPDATE public.ecd_marketplace_orders AS orders
SET status = 'cancelled'
FROM ranked_open_orders AS ranked
WHERE orders.id = ranked.id
  AND ranked.row_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_orders_open_unique
  ON public.ecd_marketplace_orders (ecd_id, service_id)
  WHERE status IN ('cart', 'requested', 'paid');
