BEGIN;

ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'invite_link_opened';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'welcome_pack_viewed';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'welcome_pack_scenario_opened';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'welcome_pack_cta_clicked';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'qr_poster_viewed';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'qr_poster_print_clicked';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'qr_poster_print_completed';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'onboarding_step_viewed';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'onboarding_step_completed';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'onboarding_completed';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'first_value_reached';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'parent_record_created';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'parent_record_updated';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'parent_record_deleted';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'pwa_prompt_shown';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'pwa_install_clicked';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'pwa_install_accepted';
ALTER TYPE ecd_analytics_event_type ADD VALUE IF NOT EXISTS 'pwa_install_dismissed';

COMMIT;

