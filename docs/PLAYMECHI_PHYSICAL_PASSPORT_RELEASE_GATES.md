# PlayMechi Physical Passport Release Gates

Status: **deferred until the digital Gamer Passport proves safe, useful, and repeatable**.

Physical cards, QR cards, NFC tags, lanyards, and event credentials can make a Gamer Passport tangible, but they also create identity, privacy, fulfillment, support, and fraud obligations. This document defines the evidence required before Mechi spends money or gives a physical credential access privileges.

## Product principle

The physical object is a pointer to a user-controlled digital Passport. It is not a second identity database, proof of legal identity, proof of age, payment instrument, or permanent access credential.

The printed surface must use a revocable opaque token or short URL. It must never encode a Supabase user ID, email address, phone number, date of birth, access token, friend token, or private Passport data.

## Required gates

### Gate 1: digital reliability

- Public Passport, owner editor, Gamer Cards, comparison, CV, and privacy controls meet their release SLOs for 30 consecutive days.
- No unresolved P0 or P1 Passport incident exists.
- Published profile links remain stable across handle changes through an approved redirect or replacement strategy.
- Card activation, revocation, and lost-card support flows have automated tests.

### Gate 2: demonstrated demand

- At least 250 eligible active Passport owners, or another written threshold approved by the Boss.
- At least 25% of published owners share a Passport or Gamer Card in a rolling 30-day window.
- At least 15% of recipients return for a second Passport view or comparison in that window.
- At least 100 explicit, recorded expressions of interest in a physical card; passive page views do not count.

### Gate 3: privacy and safeguarding

- Zero confirmed private-field disclosure incidents for 60 days.
- Minors cannot be included in a public physical-card pilot unless a separate safeguarding review and guardian-consent design is approved.
- The owner can pause the card, revoke it, replace it, and see its recent scan history.
- Scans show the same centralized visibility-filtered DTO as the web Passport.
- Location is not collected from a scan unless the visitor gives separate, explicit consent.
- Public scan analytics are aggregate and privacy-safe; raw IP addresses and precise location are not retained.

### Gate 4: event utility

- A QR-only event pilot proves check-in usefulness before NFC is introduced.
- Check-in works with weak connectivity and has a manual fallback.
- Event credentials distinguish self-claimed attendance from organizer-verified attendance.
- A public scan never grants tournament entry, prize eligibility, age verification, or venue access without a second authoritative check.

### Gate 5: unit economics

- Supplier samples pass print, QR readability, durability, and tamper checks.
- Fully loaded unit cost includes printing, packaging, payment fees, delivery, replacement allowance, support time, and failed deliveries.
- The approved price maintains the written gross-margin target after replacement and support costs.
- Pilot exposure is capped with a fixed quantity and budget approved by the Boss.

### Gate 6: operations and support

- Owner verifies delivery details immediately before fulfillment.
- Activation requires an authenticated owner session; receiving the card alone cannot claim an account.
- Lost, stolen, duplicate, returned, and undelivered states are defined.
- Support can locate a card by opaque card ID without exposing the owner’s private data.
- Every activation, pause, revocation, reassignment attempt, and replacement is audited.
- There is a written data-retention and deletion procedure for fulfillment records.

## Recommended rollout

1. **Digital-only:** continue Gamer Card sharing and measure demand.
2. **QR event badge pilot:** 25–50 opted-in adult participants at one Mechi-run event.
3. **QR membership card pilot:** 100 opted-in owners, no access-control privileges.
4. **NFC experiment:** only after QR behavior, loss rate, support load, and unit economics are understood.
5. **General availability:** only after a post-pilot review signed off by product, privacy, support, and the Boss.

## Explicit non-goals for the first pilot

- No stored payment value.
- No proof-of-age or legal-identity claim.
- No automatic friend request on scan.
- No exact home location, phone number, or email on the card.
- No permanent URL that cannot be revoked.
- No physical card for a minor in the initial pilot.

## Go/no-go record

Before procurement, create a dated decision record containing the measured gate values, supplier quote, pilot cap, owner-consent text, incident owner, rollback plan, and the Boss’s approval. Until that record exists, physical Passport work remains research only.
