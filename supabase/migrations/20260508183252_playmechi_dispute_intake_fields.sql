ALTER TABLE public.online_tournament_disputes
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS reporter_contact text,
  ADD COLUMN IF NOT EXISTS evidence_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.online_tournament_disputes
  DROP CONSTRAINT IF EXISTS online_tournament_disputes_category_check;

ALTER TABLE public.online_tournament_disputes
  ADD CONSTRAINT online_tournament_disputes_category_check CHECK (
    category IN (
      'wrongdoing',
      'rule_break',
      'score_issue',
      'room_issue',
      'technical_issue',
      'other'
    )
  );
