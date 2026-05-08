import type { OnlineTournamentRegistrationOpsRow } from '@/lib/online-tournament-ops';
import {
  isValidTournamentDeviceSerialLast6,
  requiresTournamentDeviceSerialLast6,
} from '@/lib/online-tournament';

export type TournamentModeratorRosterMode =
  | 'checked_in'
  | 'ready'
  | 'needs_attention'
  | 'registered'
  | 'all';

export type TournamentModeratorRosterCounts = Record<TournamentModeratorRosterMode, number>;

export type CodmModeratorRosterMode = TournamentModeratorRosterMode;
export type CodmModeratorRosterCounts = TournamentModeratorRosterCounts;

export function hasCompleteTournamentCheckInDetails(registration: OnlineTournamentRegistrationOpsRow) {
  const hasRequiredDeviceSerial = !requiresTournamentDeviceSerialLast6(registration.game) ||
    isValidTournamentDeviceSerialLast6(registration.device_serial_last6);

  return Boolean(
    registration.check_in_status === 'checked_in' &&
      registration.in_game_username?.trim() &&
      registration.game_uid?.trim() &&
      registration.device_model?.trim() &&
      registration.whatsapp_number?.trim() &&
      hasRequiredDeviceSerial
  );
}

export function hasTournamentLobby(registration: OnlineTournamentRegistrationOpsRow) {
  return Boolean(registration.tournament_lobby_number && registration.tournament_lobby_slot);
}

export function needsTournamentRosterAttention(registration: OnlineTournamentRegistrationOpsRow) {
  return (
    Boolean(registration.user?.is_banned) ||
    registration.eligibility_status === 'ineligible' ||
    registration.eligibility_status === 'disqualified' ||
    registration.check_in_status === 'no_show' ||
    (registration.check_in_status === 'checked_in' &&
      (!hasCompleteTournamentCheckInDetails(registration) || !hasTournamentLobby(registration))) ||
    (registration.check_in_status === 'checked_in' &&
      registration.eligibility_status !== 'verified')
  );
}

export function isTournamentReadyCheckedIn(registration: OnlineTournamentRegistrationOpsRow) {
  return registration.check_in_status === 'checked_in' && !needsTournamentRosterAttention(registration);
}

export function matchesTournamentRosterMode(
  registration: OnlineTournamentRegistrationOpsRow,
  mode: TournamentModeratorRosterMode
) {
  switch (mode) {
    case 'checked_in':
      return registration.check_in_status === 'checked_in';
    case 'ready':
      return isTournamentReadyCheckedIn(registration);
    case 'needs_attention':
      return needsTournamentRosterAttention(registration);
    case 'registered':
      return registration.check_in_status === 'registered';
    case 'all':
    default:
      return true;
  }
}

export function matchesTournamentRosterSearch(
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
    registration.phone,
    registration.whatsapp_number,
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

export function filterTournamentModeratorRoster(
  registrations: OnlineTournamentRegistrationOpsRow[],
  mode: TournamentModeratorRosterMode,
  query: string
) {
  return registrations.filter(
    (registration) =>
      matchesTournamentRosterMode(registration, mode) &&
      matchesTournamentRosterSearch(registration, query)
  );
}

export function getTournamentModeratorRosterCounts(
  registrations: OnlineTournamentRegistrationOpsRow[]
): TournamentModeratorRosterCounts {
  return {
    checked_in: registrations.filter((registration) => registration.check_in_status === 'checked_in')
      .length,
    ready: registrations.filter(isTournamentReadyCheckedIn).length,
    needs_attention: registrations.filter(needsTournamentRosterAttention).length,
    registered: registrations.filter((registration) => registration.check_in_status === 'registered')
      .length,
    all: registrations.length,
  };
}

export const hasCompleteCodmCheckInDetails = hasCompleteTournamentCheckInDetails;
export const hasCodmLobby = hasTournamentLobby;
export const needsCodmRosterAttention = needsTournamentRosterAttention;
export const isCodmReadyCheckedIn = isTournamentReadyCheckedIn;
export const matchesCodmRosterMode = matchesTournamentRosterMode;
export const matchesCodmRosterSearch = matchesTournamentRosterSearch;
export const filterCodmModeratorRoster = filterTournamentModeratorRoster;
export const getCodmModeratorRosterCounts = getTournamentModeratorRosterCounts;
