export const WEKA_MAWE_SLUG = 'weka-mawe-weekly-challenge';
export const WEKA_MAWE_TITLE = 'PlayMechi Weka Mawe Weekly Challenge';
export const WEKA_MAWE_PUBLIC_PATH = '/playmechi/weka-mawe';
export const WEKA_MAWE_REGISTER_PATH = `${WEKA_MAWE_PUBLIC_PATH}/register`;
export const WEKA_MAWE_CHECK_IN_PATH = `${WEKA_MAWE_PUBLIC_PATH}/check-in`;
export const WEKA_MAWE_BRACKET_PATH = `${WEKA_MAWE_PUBLIC_PATH}/bracket`;
export const WEKA_MAWE_ADMIN_PATH = '/admin/weka-mawe';
export const WEKA_MAWE_FIRST_EDITION_SLUG = 'weka-mawe-2026-05-24';
export const WEKA_MAWE_GAME = 'efootball';
export const WEKA_MAWE_GAME_LABEL = 'eFootball';
export const WEKA_MAWE_ENTRY_FEE_KES = 100;
export const WEKA_MAWE_MAX_PLAYERS = 32;
export const WEKA_MAWE_HOST_HANDLE = 'gamer_mastaa19';
export const WEKA_MAWE_FIRST_EDITION_STARTS_AT = '2026-05-24T14:00:00+03:00';

export type WekaMaweEditionStatus =
  | 'draft'
  | 'registration_open'
  | 'check_in_open'
  | 'locked'
  | 'live'
  | 'completed'
  | 'cancelled';

export type WekaMaweRoundKey =
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_finals'
  | 'semi_finals'
  | 'final';

export type WekaMawePaymentStatus =
  | 'pending_payment'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'manual_review';

export type WekaMaweEligibilityStatus =
  | 'pending'
  | 'verified'
  | 'ineligible'
  | 'disqualified';

export type WekaMaweRecordingStatus = 'not_required' | 'expected' | 'received' | 'missing';

export type WekaMaweEdition = {
  id: string;
  slug: string;
  title: string;
  game: string;
  host_handle: string;
  registration_fee_kes: number;
  max_players: number;
  starts_at: string;
  registration_closes_at: string | null;
  check_in_opens_at: string | null;
  check_in_closes_at: string | null;
  status: WekaMaweEditionStatus;
  bracket_locked: boolean;
  winner_user_id: string | null;
};

export type WekaMaweRegistration = {
  id: string;
  edition_id: string;
  user_id: string;
  ign: string;
  phone: string | null;
  whatsapp_number: string | null;
  payment_status: WekaMawePaymentStatus;
  amount_kes: number;
  payment_reference: string | null;
  payment_authorization_url: string | null;
  payment_confirmed_at: string | null;
  registered_at: string;
  eligibility_status: WekaMaweEligibilityStatus;
  admin_note: string | null;
  user?: { id: string; username: string | null; email?: string | null; phone?: string | null } | null;
};

export type WekaMaweCheckIn = {
  id: string;
  edition_id: string;
  user_id: string;
  registration_id: string;
  status: 'checked_in' | 'cancelled' | 'no_show';
  checked_in_at: string;
};

export type WekaMaweBracketMatch = {
  id: string;
  edition_id: string;
  round_key: WekaMaweRoundKey;
  round_index: number;
  match_number: number;
  seed_one: number | null;
  seed_two: number | null;
  player_one_registration_id: string | null;
  player_two_registration_id: string | null;
  player_one_user_id: string | null;
  player_two_user_id: string | null;
  player_one_score: number | null;
  player_two_score: number | null;
  winner_registration_id: string | null;
  winner_user_id: string | null;
  status: 'pending' | 'ready' | 'live' | 'completed' | 'disputed' | 'void';
  next_match_number: number | null;
  next_player_slot: 1 | 2 | null;
  recording_expected: boolean;
  recording_status: WekaMaweRecordingStatus;
  recording_url: string | null;
  completed_at: string | null;
  player_one?: { id: string; username: string | null } | null;
  player_two?: { id: string; username: string | null } | null;
};

export type WekaMaweSummary = {
  edition: WekaMaweEdition | null;
  registrations: WekaMaweRegistration[];
  checkIns: WekaMaweCheckIn[];
  matches: WekaMaweBracketMatch[];
  totals: {
    registered: number;
    paid: number;
    pendingPayment: number;
    checkedIn: number;
    slotsLeft: number;
  };
  userRegistration?: WekaMaweRegistration | null;
  userCheckIn?: WekaMaweCheckIn | null;
};

const ROUND_ORDER: Array<{
  key: WekaMaweRoundKey;
  label: string;
  index: number;
  matchCount: number;
}> = [
  { key: 'round_of_32', label: 'Round of 32', index: 1, matchCount: 16 },
  { key: 'round_of_16', label: 'Round of 16', index: 2, matchCount: 8 },
  { key: 'quarter_finals', label: 'Quarter-finals', index: 3, matchCount: 4 },
  { key: 'semi_finals', label: 'Semi-finals', index: 4, matchCount: 2 },
  { key: 'final', label: 'Final', index: 5, matchCount: 1 },
];

export const WEKA_MAWE_ROUNDS = ROUND_ORDER;
export const WEKA_MAWE_RECORDING_ROUNDS = new Set<WekaMaweRoundKey>([
  'quarter_finals',
  'semi_finals',
  'final',
]);

export function cleanWekaMaweText(value: unknown, maxLength = 160) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function formatEatDateTime(value: string | Date | null | undefined) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function isWekaMawePaidStatus(status: string | null | undefined) {
  return status === 'paid';
}

export function isWekaMaweRegistrationOpen(edition: WekaMaweEdition | null, now = new Date()) {
  if (!edition || edition.status !== 'registration_open') return false;
  if (!edition.registration_closes_at) return true;
  return now <= new Date(edition.registration_closes_at);
}

export function isWekaMaweCheckInOpen(edition: WekaMaweEdition | null, now = new Date()) {
  if (!edition || !['check_in_open', 'locked', 'live'].includes(edition.status)) return false;
  const opensAt = edition.check_in_opens_at ? new Date(edition.check_in_opens_at) : null;
  const closesAt = edition.check_in_closes_at ? new Date(edition.check_in_closes_at) : null;
  return (!opensAt || now >= opensAt) && (!closesAt || now <= closesAt);
}
