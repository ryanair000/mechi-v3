# PlayMechi Gamer Passport Access Policy

Status: P1-7 implementation contract

Owner: Mechi product, privacy, search, community, and trust operations

Last updated: August 14, 2026

## Purpose

This policy separates direct Passport access from discovery. Turning discovery off is not the same as making a Passport private. Product copy, metadata, comparisons, community activity, search queries, and future integrations must use the same four access modes.

## The four modes

| Mode | Stored state | Direct `@handle` URL | PlayMechi discovery | Search indexing | Community activity |
| --- | --- | --- | --- | --- | --- |
| Private | draft, or private default | unavailable publicly | excluded | no index | private |
| Friends | published + friends default | resolves, but protected content requires an accepted friend | excluded | no index | friends only |
| Link-only | published + public default + discovery off | public to anyone with the link | excluded | no index | private to prevent ambient rediscovery |
| Discoverable | published + public default + discovery on | public | eligible | indexable | public subject to field/source visibility |

Field-level visibility remains an additional restriction. An access mode is a ceiling, never permission to widen a private or friends-only field.

## Publication

Publication and discovery are separate owner actions.

- Publishing requires a validated public handle, a safe public display name, explicit versioned consent, and either Public or Friends visibility.
- Publishing with Public visibility starts link-only unless discovery was already validly enabled on a published row. The owner UI does not enable discovery automatically.
- Publishing with Friends visibility creates a resolvable handle but strangers receive a privacy-safe restricted response.
- Unpublishing removes direct public access, clears public visibility, and disables discovery.
- Minor-account protection overrides every mode and forces Private.

Before publishing, the owner must be told whether the direct link will be public to anyone or restricted to accepted friends.

## Discovery

Discovery means eligibility for ambient exposure, including:

- PlayMechi player search;
- recommendations;
- non-friend comparisons;
- mutual-friend surfaces;
- community activity discovery;
- search-engine indexing;
- future sitemap inclusion.

Discovery requires a published Passport, Public default visibility, and a valid public handle. Database constraints and application validation enforce those prerequisites.

When discovery is off on a public Passport, direct links and intentional share cards still work. Metadata must use `noindex`, `nofollow`, `noarchive`, `nocache`, and `noimageindex`; this reduces ambient discovery but cannot revoke links already shared with other people or third-party services.

## Friends mode

Friends mode is not link-only. The handle can resolve so an accepted friend can request the Passport, but strangers must receive a restricted projection. Friend authorization must use the current active account and live friendship/block state.

Friends-only activity may be visible to authorized friends. It must not be forced private merely because public discovery is disabled.

## Link-only mode

Link-only is intentionally public-by-link. It is appropriate for a player who wants to share a Passport directly without appearing in ambient search or recommendations.

Link-only Passports are excluded from:

- player discovery queries;
- non-friend comparison creation;
- public community activity projection;
- public search indexing.

Link-only is not a secrecy control. Anyone who receives or guesses the validated handle can view the public fields. To revoke that access, the owner must unpublish or switch to Friends and save.

## Operational and developer rules

1. Use `resolvePassportAccessMode` instead of interpreting the three stored fields independently.
2. Public direct routes may serve Link-only and Discoverable Passports.
3. Search, recommendations, public comparisons, and ambient community surfaces require Discoverable.
4. Metadata is indexable only for Discoverable.
5. Friends mode requires live viewer authorization on every protected read.
6. Unknown or internally inconsistent state fails to Private.
7. A future sitemap must include Discoverable only.
8. Analytics must record the derived mode, not infer intent from `is_discoverable` alone.

Existing community activity is clamped by a database trigger whenever publication, default visibility, discovery, or field visibility changes. The trigger only narrows access: Private and Link-only clamp activity to Private, while Friends changes only formerly Public activity to Friends. The owner mutation then rebuilds exact audiences from field and source visibility. A failed rebuild therefore leaves activity more private, never more public.

## Required regression matrix

Every release must verify:

- draft + any discovery flag resolves Private;
- published + Private default fails closed as Private;
- published + Friends resolves Friends regardless of a stale discovery flag;
- published + Public + discovery off resolves Link-only;
- published + Public + discovery on resolves Discoverable;
- Link-only direct HTML/API/cards remain available;
- Link-only metadata is not indexable;
- Link-only is absent from search, recommendations, non-friend comparisons, and public activity;
- Friends direct access is restricted for strangers and available to accepted friends;
- Friends activity has a Friends ceiling;
- unpublishing disables discovery;
- minor protection overrides publication and discovery.
