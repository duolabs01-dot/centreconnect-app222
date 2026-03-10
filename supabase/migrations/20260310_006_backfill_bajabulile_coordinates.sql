UPDATE public.ecd_centres
SET
  latitude = COALESCE(latitude, -26.1052),
  longitude = COALESCE(longitude, 28.0872)
WHERE LOWER(name) LIKE 'bajabulile%';
