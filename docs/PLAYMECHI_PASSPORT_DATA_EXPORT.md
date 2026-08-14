# PlayMechi Gamer Passport data export

Status: implemented V1  
Owner: Privacy and Trust  
Format: UTF-8 JSON (`passport-export-v1`)

## User flow

An authenticated player opens `/passport/export`, creates an export, and
downloads it through the returned one-time capability URL while their active
Mechi session is still present. The capability is not sufficient by itself:
the server also requires that the authenticated account owns the export.

- At most three exports may be created per account in a rolling 24-hour window.
- The database serializes the rate-limit decision per account to prevent
  concurrent requests from bypassing the limit.
- Export payloads and token hashes expire after 24 hours.
- Expired payloads and token hashes are scrubbed by the Passport retention job.
- Requests, readiness, downloads, failures, and expiry are recorded in a
  server-only audit table without storing the raw request ID.
- Responses are `private, no-store`, attachment-only JSON with `nosniff`,
  `no-referrer`, and search/archive prohibitions.

## Included data

- core account contact and regional data belonging to the requester;
- Passport identity, publication consent, discovery, and field visibility;
- aggregate summary and complete owner game journal;
- verification records with verification state, source type/key, issuance, and
  revocation state;
- event credentials and evidence/consent state;
- friendships, follows, blocks, and comparison actions with other players
  represented by stable pseudonymous references rather than direct IDs;
- highlights, dimensions, achievements, cosmetics, showcase, and shelves;
- annual Replay snapshots and competitive projections;
- Gamer CV and media-kit settings;
- provider account/consent/sync status;
- normalized external item history and import actions.

## Explicit exclusions

- passwords, authentication action tokens, JWT/session material, and fraud
  controls;
- provider access/refresh tokens and encryption metadata;
- developer token hashes, webhook signing secrets, and private endpoints;
- raw third-party provider payloads and conflict metadata;
- another player’s direct identifier, profile, contact details, or private
  Passport content;
- internal moderation, abuse-detection, and security investigation records;
- raw analytics request identifiers.

These exclusions protect authentication security, other people’s rights, and
provider contractual boundaries. They do not remove the player’s own authored
content, privacy settings, verification state, source attribution, or connection
history.

## Storage and authorization contract

`passport_data_exports` and `passport_data_export_audit` have RLS enabled and no
`anon` or `authenticated` table privileges. Only server-side service access can
create or consume a bundle. Download lookup requires all of:

1. an active Mechi session;
2. the same owner UUID as the export row;
3. a SHA-256 match for the random 256-bit download token;
4. `ready` status;
5. an unexpired timestamp.

The raw token is returned only in the creation response and is never stored.
Recent-export listings intentionally cannot recreate a lost download URL; the
owner must generate another bounded export.

## Verification

The Passport E2E release gate proves that anonymous and different-user access
fail, the owner can download, the bundle contains the required domains, provider
secrets are absent, another player’s UUID is absent, and the download audit row
is written. Database verification proves RLS and browser-role grants on both
export tables.
