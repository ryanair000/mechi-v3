# PlayMechi Public Passport Cache Policy

## Security model

Caching is applied only to already-filtered anonymous Passport DTOs and anonymous public-page feature projections. Publication, handle ownership, minor-account containment, active sessions, blocks, and friendship authorization remain live checks.

Authenticated friend and owner variants are never placed in the shared Passport caches.

## Public version

Every `passport_profiles` row has a monotonic `public_version`. Anonymous cache keys include:

- the owner user ID;
- the current validated public handle;
- `public_version` for the core DTO;
- the Passport identity `updated_at`, which changes with `public_version`, for page features;
- feature-shape flags such as achievements and shelves.

The application performs a live published-handle and minor-account preflight before consulting the core cache. If a Passport is unpublished, deleted, renamed, or placed under minor protection, the request fails before an older cache entry can be read.

## Version invalidation sources

The database advances `public_version` for changes to:

- Passport publication, handle, identity, discovery, and field visibility;
- base profile data used by the public identity;
- maintained summary counts;
- game-library entries;
- verification previews;
- highlights;
- dimension snapshots;
- customization, cosmetics selection, showcase items, shelves, and shelf items;
- friendship and follow state used by public social totals;
- tournament and team content shown in previews.

Block and friendship authorization are checked live for credentialed viewers. Friend-specific DTO and feature reads bypass shared caches.

## Cache layers

| Layer | Contents | Lifetime | Safety gate |
|---|---|---:|---|
| React request memoization | Public core DTO shared by metadata and page rendering | One render request | Validated handle |
| Next data cache | Anonymous public-safe core DTO | 300 seconds, version keyed | Live publication and minor preflight |
| Next data cache | Anonymous highlights, stored progression, and public shelves | 300 seconds, version keyed | Live page viewer authorization |
| HTTP API | Revalidation required on every request | No freshness window | Live authorization and internal versioned cache |
| Friend/owner response | Personalized DTO and features | Not shared | Live active-session, block, and friendship checks |

The 300-second lifetime limits unreachable-entry retention; it is not the privacy invalidation window. Privacy and content mutations advance the key immediately.

## Progression projections

Public reads consume `passport_dimension_snapshots` only. Projection snapshots store a deterministic `source_cursor` containing formula version, source counts, and latest relevant timestamps. Unchanged authenticated refreshes do not rewrite achievements or snapshots.

`POST /api/passport/progression` is the controlled authenticated repair operation. It forces an idempotent projection rebuild and returns the resulting formula version and projection timestamp.

## Failure behavior

- Missing or invalid handles return not found without reading cached content.
- Minor-account checks fail before cache lookup.
- Missing public progression snapshots omit progression; anonymous traffic never rebuilds them.
- Cache storage failure falls back to generating the public-safe DTO; it does not bypass privacy filtering.
- Migration-order fallback uses the Passport row `updated_at` until `public_version` is available.

## Release verification

Before production promotion:

1. Apply `20260814115223_add_passport_public_cache_version.sql` after the maintained-summary migration.
2. Confirm representative source mutations increment `public_version`.
3. Warm one anonymous Passport and verify repeat reads hit the Next data cache.
4. Change field visibility and verify the next anonymous read uses a new cache key.
5. Unpublish the Passport and verify the old URL fails immediately.
6. Create and remove a block while authenticated and verify both decisions are live.
7. Confirm friend-only content never appears in an anonymous or different-user cache entry.
