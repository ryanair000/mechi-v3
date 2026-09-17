# PlayMechi Gamer Passport Privacy Boundary

## Decision

All public and viewer-specific Gamer Passport responses must be constructed through the centralized Passport read model and visibility resolver. The Supabase service-role client bypasses row-level security, so application code—not RLS—is the final security boundary for these reads.

No public route may serialize a raw `profiles`, `user_passports`, game, event, verification, social, comparison, or analytics row.

## Trust model

```text
request + optional authenticated viewer
        |
        v
resolve owner and viewer relationship
        |
        v
central visibility policy
        |
        v
explicit public/friend/owner DTO builder
        |
        v
route or rendered page
```

The database stores more information than any one viewer may receive. A successful service-role query therefore does not imply authorization to return its result.

## Required controls

### Identity and access

- Resolve the target from a canonical, validated public handle.
- Resolve the viewer from the authenticated session or an approved, scoped invitation token.
- Apply blocked relationships before returning existence or content.
- Reject public discovery for minors and records that are not both published and public.
- Treat friend-only access as request-specific and non-cacheable.

### Data minimization

- Select only fields required to build the DTO.
- Use explicit allowlists for identity, library, event, team, verification, community, comparison, and CV sections.
- Exclude age-policy state, birth data, email, phone, provider tokens, provider payloads, moderation notes, internal IDs, raw proofs, private handles, and owner-only settings.
- Return verification status and safe provenance summaries only when the visibility policy allows them.
- Hash diagnostic subjects and request identifiers before storage.

### Caching

- Anonymous public DTOs may use the versioned public cache policy.
- Authenticated, friend, blocked, invitation, and owner responses use private/no-store behavior.
- A cache key must include the public projection version and must never collapse viewer-specific access into an anonymous response.

### Writes

- Anonymous public GETs must not mutate progression, achievements, views requiring identity, invitation state, or owner records.
- Privacy-safe aggregate product events and route diagnostics may be recorded asynchronously through server-only writers.
- Any invitation visit mutation must execute with service-role authority only; browser roles cannot execute the function.

## Public entry points covered

- `/p/@handle`
- `/p/@handle/cv`
- `/api/passport/:handle`
- `/api/passport/cards/:handle`
- `/api/passport/compare/:handle`
- `/api/passport/cv/:handle/pdf`
- public discovery through `sitemap.xml`

New public Passport routes must be added to this list and to the runtime security suite before merge.

## Verification requirements

The release gate must prove, against a disposable Supabase database:

- anonymous public DTOs contain only approved public fields;
- friend-only data is absent anonymously and present for an accepted friend;
- blocked viewers receive a not-found response;
- minors, deleted users, unpublished profiles, and missing users are not discoverable;
- anonymous reads do not rewrite progression or achievement state;
- browser roles cannot read server-only analytics, export, or diagnostic tables;
- browser roles cannot execute privileged invitation-visit functions;
- authenticated responses are not cached publicly;
- public card, comparison, CV, and PDF routes use the same visibility result.

Source-contract tests are a backstop, not a replacement for the disposable-database and browser suite.

## Change checklist

For every new Passport field or feature:

1. Classify the field as owner-only, friend-visible, or public.
2. Define its default visibility and minor policy.
3. Add it to an explicit DTO allowlist only if needed.
4. Add negative tests proving disallowed viewers cannot receive it.
5. Review caching and diagnostics for leakage.
6. Review exports separately; owner export eligibility does not make a field public.
7. Run database verification, Passport runtime tests, type checks, lint, build, and browser gates.

## Incident response

If private data is exposed, pause the affected public route or publication surface, purge its cache, preserve diagnostics, identify affected subjects without copying sensitive payloads into tickets, notify the incident owner, and ship a tested policy-level fix. Field-by-field masking at a single route is insufficient if the centralized DTO remains unsafe.
