const E2E_FIXTURE_PATTERN = /(^|[^a-z0-9])e2e([^a-z0-9]|$)/i;

function matchesE2EFixture(value: unknown) {
  return typeof value === 'string' && E2E_FIXTURE_PATTERN.test(value);
}

export function shouldHideE2EFixtures() {
  return process.env.NODE_ENV !== 'test';
}

export function isE2ELobbyFixture(record: { title?: unknown; room_code?: unknown } | null | undefined) {
  return matchesE2EFixture(record?.title) || matchesE2EFixture(record?.room_code);
}

export function isE2ETournamentFixture(record: { title?: unknown; slug?: unknown } | null | undefined) {
  return matchesE2EFixture(record?.title) || matchesE2EFixture(record?.slug);
}

export function isE2EBountyFixture(record: { title?: unknown; description?: unknown } | null | undefined) {
  return matchesE2EFixture(record?.title) || matchesE2EFixture(record?.description);
}

export function filterVisibleLobbies<T>(rows: T[]) {
  if (!shouldHideE2EFixtures()) {
    return rows;
  }

  return rows.filter((row) => !isE2ELobbyFixture((row as Record<string, unknown> | null | undefined) ?? null));
}

export function filterVisibleTournaments<T>(rows: T[]) {
  if (!shouldHideE2EFixtures()) {
    return rows;
  }

  return rows.filter(
    (row) => !isE2ETournamentFixture((row as Record<string, unknown> | null | undefined) ?? null)
  );
}

export function filterVisibleBounties<T>(rows: T[]) {
  if (!shouldHideE2EFixtures()) {
    return rows;
  }

  return rows.filter((row) => !isE2EBountyFixture((row as Record<string, unknown> | null | undefined) ?? null));
}
