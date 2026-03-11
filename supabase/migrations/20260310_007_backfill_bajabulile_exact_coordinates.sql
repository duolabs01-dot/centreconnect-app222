update public.ecd_centres
set latitude = -26.1038,
    longitude = 28.0916,
    updated_at = now()
where slug in ('bajabulile', 'bajabulile-day-care-centre')
   or id = 'f580f125-81ed-412a-8d25-f187605a6a69';
