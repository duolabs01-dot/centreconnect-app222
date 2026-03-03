BEGIN;

ALTER TABLE public.report_cards
  DROP CONSTRAINT IF EXISTS report_cards_period_range_check;

ALTER TABLE public.report_cards
  ADD CONSTRAINT report_cards_period_range_check
  CHECK (
    period_start IS NULL
    OR period_end IS NULL
    OR period_start <= period_end
  );

DROP TRIGGER IF EXISTS update_report_cards_updated_at ON public.report_cards;

CREATE TRIGGER update_report_cards_updated_at
BEFORE UPDATE ON public.report_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

COMMIT;
