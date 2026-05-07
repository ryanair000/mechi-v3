import type { OnlineTournamentRegistrationOpsRow } from '@/lib/online-tournament-ops';

export type CodmModeratorRosterMode = 'checked_in' | 'needs_attention' | 'registered' | 'all';

export type CodmModeratorRosterCounts = Record<CodmModeratorRosterMode, number>;

export function hasCompleteCodmCheckInDetails(registration: OnlineTournamentRegistrationOpsRow) {
  return Boolean(
    registration.check_in_status === 'checked_in' &&
      registration.in_game_username?.trim() &&
      registration.game_uid?.trim() &&
      registration.device_model?.trim() &&
      registration.whatsapp_number?.trim() &&
      /^\d{6}$/.test(registration.device_serial_last6 ?? '')
  );
}

export function hasCodmLobby(registration: OnlineTournamentRegistrationOpsRow) {
  return Boolean(registration.tournament_lobby_number && registration.tournament_lobby_slot);
}

export function needsCodmRosterAttention(registration: OnlineTournamentRegistrationOpsRow) {
  return (
    Boolean(registration.user?.is_banned) ||
    registration.eligibility_status === 'ineligible' ||
    registration.eligibility_status === 'disqualified' ||
    registration.check_in_status === 'no_show' ||
    (registration.check_in_status === 'checked_in' &&
      (!hasCompleteCodmCheckInDetails(registration) || !hasCodmLobby(registration))) ||
    (registration.check_in_status === 'checked_in' &&
      registration.eligibility_status !== 'verified')
  );
}

export function isCodmReadyCheckedIn(registration: OnlineTournamentRegistrationOpsRow) {
  return registration.check_in_status === 'checked_in' && !needsCodmRosterAttention(registration);
}

export function matchesCodmRosterMode(
  registration: OnlineTournamentRegistrationOpsRow,
  mode: CodmModeratorRosterMode
) {
  switch (mode) {
    case 'checked_in':
      return isCodmReadyCheckedIn(registration);
    case 'needs_attention':
      return needsCodmRosterAttention(registration);
    case 'registered':
      return registration.check_in_status === 'registered';
    case 'all':
    default:
      return true;
  }
}

export function matchesCodmRosterSearch(
  registration: OnlineTournamentRegistrationOpsRow,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    registration.user?.username,
    registration.in_game_username,
    registration.game_uid,
    registration.device_model,
    registration.device_serial_last6,
    registration.admin_note,
    registration.eligibility_status,
    registration.check_in_status,
    registration.tournament_lobby_number
      ? `lobby ${registration.tournament_lobby_number}`
      : null,
    registration.tournament_lobby_slot ? `slot ${registration.tournament_lobby_slot}` : null,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

export function filterCodmModeratorRoster(
  registrations: OnlineTournamentRegistrationOpsRow[],
  mode: CodmModeratorRosterMode,
  query: string
) {
  return registrations.filter(
    (registration) =>
      matchesCodmRosterMode(registration, mode) &&
      matchesCodmRosterSearch(registration, query)
  );
}

export function getCodmModeratorRosterCounts(
  registrations: OnlineTournamentRegistrationOpsRow[]
): CodmModeratorRosterCounts {
  return {
    checked_in: registrations.filter(isCodmReadyCheckedIn).length,
    needs_attention: registrations.filter(needsCodmRosterAttention).length,
    registered: registrations.filter((registration) => registration.check_in_status === 'registered')
      .length,
    all: registrations.length,
  };
}
