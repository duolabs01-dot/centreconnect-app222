-- Launch marketplace seed data for existing marketplace_services schema.
-- Table schema in this project: service_name, price, description, is_active.

INSERT INTO public.marketplace_services (service_name, price, description, is_active)
VALUES
  ('Starter Website Package', 1499.00, 'Professional public centre page setup with hero, programs, gallery, and apply CTA.', true),
  ('Premium Website + Branding', 3499.00, 'Full website styling pass, branding consistency, and enhanced public conversion setup.', true),
  ('Centre Photography Shoot', 2999.00, 'Professional on-site photo shoot for classrooms, staff, and facilities.', true),
  ('WhatsApp Business Setup', 999.00, 'Business profile setup, quick replies, and parent communication structure.', true),
  ('WhatsApp API Integration', 4999.00, 'Announcement delivery integration to WhatsApp with support setup.', true),
  ('ECD Compliance Training', 599.00, 'Staff training on compliance, record-keeping, and safeguarding basics.', true),
  ('CentreConnect Team Training', 1499.00, 'Live platform training for admin and staff on daily workflows.', true),
  ('Practitioner Upskilling', 1999.00, 'Structured upskilling programme for ECD practitioners and assistants.', true),
  ('Monthly Activity Packs', 299.00, 'Monthly themed activity packs for toddler and preschool groups.', true),
  ('Annual Curriculum Pack', 1499.00, 'Full-year curriculum framework with planning and assessment templates.', true),
  ('Bookkeeping Service', 2999.00, 'Monthly bookkeeping, arrears visibility, and reporting support.', true),
  ('Subsidy and Grant Assistance', 1999.00, 'Help preparing and submitting subsidy/grant documentation.', true)
ON CONFLICT (service_name)
DO UPDATE SET
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

