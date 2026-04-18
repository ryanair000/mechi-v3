ALTER TABLE tournaments
  ALTER COLUMN platform_fee_rate SET DEFAULT 5;

UPDATE tournaments
SET platform_fee_rate = 5
WHERE platform_fee_rate = 10;
