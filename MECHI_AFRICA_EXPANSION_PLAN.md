# Mechi Africa Expansion Review And Implementation Plan

## Goal

Make `mechi.club` work as an Africa-wide PlayMechi hub:

- `/africa` is the universal Africa homepage.
- `/ke`, `/tz`, `/ug`, `/ghana`, `/nigeria`, `/south-africa`, and every other supported African country route can carry the player onward in that country context.
- IP country headers select the best country route when possible.
- Registration asks for country and region, with searchable country and region suggestions plus free typing for regions.
- Tournaments remain accessible to players across African countries.
- Payment messaging supports card-first fallback outside Kenya, while preserving Paystack/M-PESA/Airtel rails where the provider supports them.

## Current Repo Findings

- The app already uses Next.js App Router and `src/proxy.ts` for country-aware request routing.
- Existing regional support was limited to Kenya, Tanzania, and Uganda routes, with Rwanda and Ethiopia only partially present in the data model.
- Registration already posted a country, but did not ask players to choose country and region in the form.
- Profile and tournament creation already had country/region concepts, but the source country list was too small.
- Weekend Cup payment already goes through Paystack and warns that M-PESA requires a Kenyan Safaricom number.
- Payments are stored internally as KES fields such as `entry_fee_kes`; this is important for financial audit consistency.

## Implemented In This Pass

### 1. Africa Country Source Of Truth

Updated `src/lib/location.ts` to include all African countries with:

- Mechi country key
- display label
- ISO-2 code for IP headers
- public route slug
- dial code and expected subscriber length
- country currency code and symbol
- popular region/city suggestions plus `Other`

The app now exposes `AFRICAN_COUNTRY_KEYS`, `COUNTRY_OPTIONS`, ISO lookup, country slug lookup, currency lookup, and validation helpers from the same source.

### 2. IP And Country Routing

Updated `src/proxy.ts` so regional route configs are generated from all African countries instead of a hardcoded East Africa list.

Routing behavior:

- `/` checks IP country headers and redirects to the matching African country route when known.
- If IP country is unknown, `/` redirects to `/africa`.
- `/usa` now redirects to `/africa`.
- Country-prefixed routes such as `/ghana/register` or `/nigeria/weekendcup` keep the URL country context while rewriting to the underlying app route.

### 3. Africa And Country Pages

Added:

- `src/app/africa/page.tsx`
- `src/app/[countrySlug]/page.tsx`

The dynamic country page validates the slug against the Africa country list and renders the existing home shell with a manual regional setting for that country.

### 4. Registration Country And Region

Updated account registration:

- `src/app/(auth)/register/page.tsx`
- `src/components/ui/full-screen-signup.tsx`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/signup/route.ts`

Registration now asks for:

- country, searchable via datalist
- region/city, with popular suggestions and free typing

The API now requires a valid African country and a non-empty region, then saves both to the profile. Phone validation uses the selected country.

### 5. Phone Normalization

Updated `src/lib/phone.ts` so phone normalization and lookup variants use the Africa-wide country data instead of five hardcoded countries.

### 6. Payment And Currency Copy

Added `src/lib/currency.ts` and updated Weekend Cup registration copy.

Implemented now:

- country currency code/symbol support
- local currency guide copy for common active markets
- card-first payment messaging outside Kenya
- Paystack metadata includes preferred country, region, and currency for Weekend Cup payment initialization

Important production note:

Paystack settlement currency is not blindly switched for every country because the live Paystack account must have that currency enabled. The safe implementation is:

- keep KES as the internal audited source amount for existing tournaments
- display local currency guidance by country
- send preferred country/currency in Paystack metadata
- use card fallback where M-PESA/Airtel is not available

## Remaining Production Work

These are the next steps for full business-grade rollout:

1. Confirm the Paystack account currencies enabled for Kenya, Ghana, Nigeria, South Africa, and other launch markets.
2. Decide whether to store local amount/currency columns beside existing `entry_fee_kes`, or keep KES as canonical and store local display in metadata.
3. Add a live FX provider or an operator-managed rates table before promising exact non-KES charges.
4. Add country-specific tournament landing copy and SEO for the highest-priority launch markets.
5. Add QA coverage for `/africa`, `/ghana`, `/nigeria`, `/south-africa`, `/ghana/register`, and Weekend Cup checkout metadata.

## Risk Notes

- Country routing changes affect public navigation and SEO.
- Registration API now requires region, so old lightweight signup clients must send it.
- Payment settlement currency should not be changed in code until provider capability is verified.
