# PlayMechi Minor-Account Privacy Policy

Status: P1-6 implementation policy

Owner: Mechi product, privacy, support, and trust operations

Last updated: August 14, 2026

## Purpose

This policy defines the first operational safety boundary for Gamer Passport accounts identified as belonging to a person under 18. It is designed to prevent accidental public exposure while Mechi develops any age-assurance, parental-consent, and jurisdiction-specific workflows required for a broader minor offering.

This is a safety-containment control. It is not, by itself, proof of age, proof of parental or guardian consent, or a complete legal compliance program.

## Product rule

Gamer Passport stores only one private age-policy category:

- `unknown`: no age group has been declared;
- `minor`: under-18 privacy protections are active;
- `adult`: the user or an administrator has recorded that the user is 18 or older.

The Passport feature does not request or store an exact date of birth. The category, its source, and its change timestamp are private operational data. They must never appear in a public Passport, comparison, discovery result, share card, Replay, media kit, or public API response.

## Entry and exit rules

An authenticated account owner may self-declare `minor` or `adult`. The selection requires an explicit confirmation. A self-declared minor may not remove the protection later. Only an administrator may change a protected minor account to `adult` or `unknown`, and the administrator must record a reason.

Every actual state change records:

- the affected account;
- the acting account;
- the previous and new category;
- whether the source was self-declaration or administrator review;
- the administrator reason when applicable;
- the timestamp.

Age-policy history is sensitive. It is available only through the server service role and has no anonymous or authenticated-client table access.

## Atomic quarantine when an account becomes minor

The database transition into `minor` must complete in the same transaction as the age-policy change. It:

1. unpublishes the Gamer Passport and returns it to draft;
2. clears publication consent and publication timestamps;
3. changes the default and every field-level visibility to private;
4. disables discovery, including location discovery;
5. makes game entries, highlights, showcase items, and custom shelves private;
6. makes activity objects private;
7. makes Replay snapshots non-public;
8. disables Gamer CV inquiries and removes the inquiry URL;
9. disables media kits and removes the inquiry URL.

Database `BEFORE INSERT OR UPDATE` triggers apply the same restrictions to future writes. Application-layer guards also block publication, public handle resolution, public Replay reads and writes, public media-kit reads and writes, and inquiry enablement.

## Exit behavior

Leaving `minor` does not restore any former public state. Publication, discovery, visibility, Replay sharing, media-kit sharing, and inquiry settings remain private or disabled. The owner must make new, explicit sharing decisions after the administrator review. Old publication consent is never reused.

## Public-data contract

The private age-policy object is included only in the authenticated Passport owner response. Public Passport types have no age-policy field. Generic profile responses explicitly remove the underlying database columns, and admin endpoints return them only to authorized operational users.

Public surfaces must fail closed when either of these conditions is true:

- the account age policy is `minor`; or
- required age-policy storage cannot safely support a requested mutation.

Legacy accounts remain `unknown`; they are not silently classified as adults.

## User experience

The Passport editor explains that:

- the choice is private;
- exact date of birth is not stored by this feature;
- under-18 mode immediately makes all connected Passport sharing private;
- removing under-18 protection requires administrator review.

While minor protection is active, publication, visibility widening, and discovery controls are disabled. The owner can still use their private Passport.

## Administrator procedure

Before changing a protected minor account, the administrator must:

1. confirm the request concerns the correct account;
2. follow the approved identity or age-review procedure for the relevant jurisdiction;
3. avoid placing identity documents, dates of birth, or other sensitive evidence in the free-text audit reason;
4. record a concise operational reason of 5–500 characters;
5. tell the owner that public sharing remains off and must be re-enabled explicitly.

An administrator reason is an audit note, not an age-verification credential.

## Support and incident handling

If an under-18 account was public before protection was activated, support should treat the transition as a privacy incident check:

1. confirm the account is now `minor`;
2. confirm the Passport is draft and non-discoverable;
3. confirm all connected sharing surfaces are private or disabled;
4. invalidate or remove cached public representations where operationally possible;
5. escalate any suspected exploitation, grooming, or child-safety risk through the safety process;
6. retain only the minimum incident evidence required by policy and law.

## Known limitations and required follow-up

This first control does not provide:

- verified age assurance;
- parental or guardian identity and consent;
- consent renewal or withdrawal workflows;
- country-specific age-of-digital-consent decisions;
- child-accessible privacy notices tested with young users;
- automated deletion of already-indexed third-party caches;
- a complete child-rights or data-protection impact assessment.

Before Mechi intentionally offers the full service to minors, legal and privacy owners must complete a jurisdiction-aware review, define any required parental/guardian workflow, validate notices with the intended age groups, and approve a child-data DPIA or equivalent assessment. The existing public Privacy Policy statement that PlayMechi is not intended for children under 13 remains in force.

## Verification requirements

Release validation must cover:

- `unknown -> minor` self-declaration;
- `adult -> minor` self-declaration;
- rejection of `minor -> adult` self-declaration;
- administrator `minor -> adult` with a reason;
- rejection of administrator changes without a valid reason;
- atomic quarantine of existing public content;
- forced-private behavior for new writes;
- no age-policy fields in public Passport or generic profile DTOs;
- no automatic republishing after leaving minor mode.

The production migration must be applied before enabling the owner controls in production. Deployment order is migration first, application second.
