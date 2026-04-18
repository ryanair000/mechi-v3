ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE profiles
  ALTER COLUMN region SET DEFAULT 'Other';

ALTER TABLE queue
  ALTER COLUMN region SET DEFAULT 'Unspecified';

ALTER TABLE matches
  ALTER COLUMN region SET DEFAULT 'Unspecified';

ALTER TABLE tournaments
  ALTER COLUMN region SET DEFAULT 'Other';

UPDATE profiles
SET country = lower(trim(country))
WHERE country IS NOT NULL
  AND trim(country) <> '';

UPDATE profiles
SET country = CASE
  WHEN country IS NOT NULL AND trim(country) <> '' THEN country
  WHEN region ~* '^Kenya\s*(?:·|\||-|:)\s*' THEN 'kenya'
  WHEN region ~* '^Tanzania\s*(?:·|\||-|:)\s*' THEN 'tanzania'
  WHEN region ~* '^Uganda\s*(?:·|\||-|:)\s*' THEN 'uganda'
  WHEN region ~* '^Rwanda\s*(?:·|\||-|:)\s*' THEN 'rwanda'
  WHEN region ~* '^Ethiopia\s*(?:·|\||-|:)\s*' THEN 'ethiopia'
  WHEN lower(trim(region)) IN ('nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'machakos', 'nyeri') THEN 'kenya'
  WHEN lower(trim(region)) IN ('dar es salaam', 'arusha', 'dodoma', 'mwanza', 'mbeya', 'zanzibar', 'morogoro') THEN 'tanzania'
  WHEN lower(trim(region)) IN ('kampala', 'entebbe', 'jinja', 'mbarara', 'gulu', 'mbale', 'arua') THEN 'uganda'
  WHEN lower(trim(region)) IN ('kigali', 'huye', 'musanze', 'rubavu', 'rwamagana') THEN 'rwanda'
  WHEN lower(trim(region)) IN ('addis ababa', 'adama', 'bahir dar', 'hawassa', 'mekelle', 'dire dawa', 'jimma') THEN 'ethiopia'
  ELSE country
END
WHERE country IS NULL
   OR trim(country) = '';

UPDATE profiles
SET region = trim(
  regexp_replace(
    region,
    '^(Kenya|Tanzania|Uganda|Rwanda|Ethiopia)\s*(?:·|\||-|:)\s*',
    '',
    'i'
  )
)
WHERE region ~* '^(Kenya|Tanzania|Uganda|Rwanda|Ethiopia)\s*(?:·|\||-|:)';
