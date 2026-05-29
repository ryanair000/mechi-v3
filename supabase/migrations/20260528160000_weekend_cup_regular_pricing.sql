UPDATE public.online_tournament_registrations
SET
  payment_tier = 'regular',
  entry_fee_kes = CASE game
    WHEN 'efootball' THEN 125
    ELSE 75
  END,
  payment_note = CASE
    WHEN payment_note IS NULL OR payment_note ILIKE '%early bird%'
      THEN 'Waiting for Paystack confirmation at regular Weekend Cup pricing. Slot is not locked yet.'
    ELSE payment_note
  END,
  updated_at = now()
WHERE event_slug = 'playmechi-weekend-cup-season-1-2026-05-29'
  AND payment_status IN ('pending_payment', 'failed', 'manual_review')
  AND (payment_tier IS NULL OR payment_tier = 'early_bird');
