BEGIN;

UPDATE public.communication_templates
SET
  title = 'We are excited to meet your family',
  body = 'Hi {{parent_name}}, {{centre_name}} would love to welcome {{child_name}} for an open day visit. Reply in the app and we will find a time that works for you.'
WHERE template_key IN ('open_day', 'open_day_invite');

UPDATE public.communication_templates
SET
  title = 'A quick document check-in',
  body = 'Hi {{parent_name}}, thank you for applying to {{centre_name}}. To keep {{child_name}}''s application moving, please upload the outstanding documents in your Documents tab.'
WHERE template_key = 'missing_documents';

UPDATE public.communication_templates
SET
  title = 'A warm update from your centre',
  body = 'Hi {{parent_name}}, here is an update from {{centre_name}} for {{child_name}}''s application ({{application_number}}): status is now {{status}}.'
WHERE template_key = 'application_update';

UPDATE public.communication_templates
SET
  title = 'A place may be available',
  body = 'Hi {{parent_name}}, {{centre_name}} may have a space available for {{child_name}}. Open your application journey to view the next steps.'
WHERE template_key IN ('spots_available', 'spot_available');

COMMIT;
