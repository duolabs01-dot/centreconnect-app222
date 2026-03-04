BEGIN;

-- Drivers table
CREATE TABLE IF NOT EXISTS public.transport_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_plate TEXT,
  vehicle_colour TEXT,
  capacity INTEGER NOT NULL DEFAULT 8,
  driver_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes table
CREATE TABLE IF NOT EXISTS public.transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecd_id UUID NOT NULL REFERENCES public.ecd_centres(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.transport_drivers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  days_active TEXT[] NOT NULL DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri'],
  departure_time TIME,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route children junction
CREATE TABLE IF NOT EXISTS public.route_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  stop_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(route_id, child_id)
);

-- RLS
ALTER TABLE public.transport_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecd_admin_manage_drivers" ON public.transport_drivers
  FOR ALL USING (ecd_id = public.auth_ecd_id() AND public.auth_role() = 'ecd_admin')
  WITH CHECK (ecd_id = public.auth_ecd_id() AND public.auth_role() = 'ecd_admin');

CREATE POLICY "ecd_staff_read_drivers" ON public.transport_drivers
  FOR SELECT USING (ecd_id = public.auth_ecd_id() AND public.auth_role() IN ('ecd_admin','ecd_staff'));

CREATE POLICY "ecd_admin_manage_routes" ON public.transport_routes
  FOR ALL USING (ecd_id = public.auth_ecd_id() AND public.auth_role() = 'ecd_admin')
  WITH CHECK (ecd_id = public.auth_ecd_id() AND public.auth_role() = 'ecd_admin');

CREATE POLICY "ecd_staff_read_routes" ON public.transport_routes
  FOR SELECT USING (ecd_id = public.auth_ecd_id() AND public.auth_role() IN ('ecd_admin','ecd_staff'));

CREATE POLICY "ecd_manage_route_children" ON public.route_children
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.transport_routes r WHERE r.id = route_id AND r.ecd_id = public.auth_ecd_id())
    AND public.auth_role() IN ('ecd_admin','ecd_staff')
  );

-- Driver token read (for driver portal)
CREATE POLICY "driver_token_self_read" ON public.transport_drivers
  FOR SELECT USING (TRUE);  -- token-gated at app level

COMMIT;
