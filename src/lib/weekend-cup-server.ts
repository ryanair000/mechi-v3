import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase';
import {
  WEEKEND_CUP_BALLOTS,
  WEEKEND_CUP_ENTRY_PRICING,
  WEEKEND_CUP_GAME_BY_KEY,
  WEEKEND_CUP_GAMES,
  WEEKEND_CUP_SLUG,
  getWeekendCupFallbackSummary,
  getWeekendCupGameRegistrationCounts,
  isWeekendCupGame,
  isWeekendCupPaidStatus,
  type WeekendCupPlayerRegistration,
  type WeekendCupRegistrationPrefill,
  type WeekendCupRegistrationSummary,
} from '@/lib/weekend-cup';
import type {
  OnlineTournamentGameKey,
  OnlineTournamentPaymentStatus,
} from '@/lib/online-tournament';
import { ONLINE_TOURNAMENT_SLUG } from '@/lib/online-tournament';

type WeekendCupRegistrationRow = WeekendCupPlayerRegistration & {
  user_id: string;
};

type WeekendCupPrefillRow = WeekendCupRegistrationPrefill & {
  updated_at: string;
};

type WeekendCupBallotRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  date_label: string;
  theme_label: string;
  cup_order: number;
  status: 'open' | 'review' | 'locked';
};

type WeekendCupBallotOptionRow = {
  id: string;
  ballot_id: string;
  slug: string;
  label: string;
  platform: 'mobile' | 'console' | 'mixed';
  description: string | null;
  is_official: boolean;
  suggested_by: string | null;
  suggestion_note: string | null;
  created_at: string;
};

type WeekendCupBallotVoteRow = {
  ballot_option_id: string;
  user_id: string;
};

function isMissingWeekendCupTableError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: string;
    details?: string;
    message?: string;
  };
  const text = [candidate.code, candidate.details, candidate.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('weekend_cup_') &&
    (text.includes('42p01') || text.includes('does not exist') || text.includes('schema cache'))
  );
}

function isMissingWeekendCupRegistrationSchemaError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: string;
    details?: string;
    message?: string;
  };
  const text = [candidate.code, candidate.details, candidate.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('online_tournament_registrations') &&
    (text.includes('payment_status') ||
      text.includes('payment_tier') ||
      text.includes('entry_fee_kes') ||
      text.includes('could not find') ||
      text.includes('does not exist'))
  );
}

export function isWeekendCupPendingPaymentStatus(status: OnlineTournamentPaymentStatus) {
  return status === 'pending_payment' || status === 'manual_review';
}

export async function getWeekendCupEarlyBirdPaidCount(params?: {
  supabase?: SupabaseClient;
  excludeRegistrationId?: string;
}) {
  const supabase = params?.supabase ?? createServiceClient();
  let query = supabase
    .from('online_tournament_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .eq('payment_status', 'paid')
    .eq('payment_tier', 'early_bird')
    .neq('eligibility_status', 'disqualified');

  if (params?.excludeRegistrationId) {
    query = query.neq('id', params.excludeRegistrationId);
  }

  const { count, error } = await query;
  if (error) {
    if (isMissingWeekendCupRegistrationSchemaError(error)) {
      return 0;
    }

    throw error;
  }

  return count ?? 0;
}

export async function loadWeekendCupRegistrations(params?: {
  supabase?: SupabaseClient;
}) {
  const supabase = params?.supabase ?? createServiceClient();
  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select(
      'id, user_id, game, in_game_username, instagram_username, youtube_name, followed_instagram, subscribed_youtube, reward_eligible, eligibility_status, check_in_status, entry_fee_kes, payment_tier, payment_status, payment_reference, payment_confirmed_at, payment_note, game_uid, whatsapp_number, device_model, device_serial_last6, checked_in_at, created_at, updated_at'
    )
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as WeekendCupRegistrationRow[];
}

export async function getWeekendCupRegistrationPrefill(params: {
  supabase?: SupabaseClient;
  userId: string;
}) {
  const supabase = params.supabase ?? createServiceClient();
  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select(
      'game, in_game_username, instagram_username, youtube_name, followed_instagram, subscribed_youtube, available_at_8pm, game_uid, whatsapp_number, device_model, device_serial_last6, updated_at'
    )
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .eq('user_id', params.userId)
    .neq('eligibility_status', 'disqualified')
    .order('updated_at', { ascending: false });

  if (error) {
    if (isMissingWeekendCupRegistrationSchemaError(error)) {
      return {};
    }

    throw error;
  }

  return ((data ?? []) as WeekendCupPrefillRow[]).reduce<
    Partial<Record<OnlineTournamentGameKey, WeekendCupRegistrationPrefill>>
  >((prefill, row) => {
    if (!isWeekendCupGame(row.game) || row.game === 'mystery' || prefill[row.game]) {
      return prefill;
    }

    prefill[row.game] = {
      game: row.game,
      in_game_username: row.in_game_username,
      instagram_username: row.instagram_username,
      youtube_name: row.youtube_name,
      followed_instagram: row.followed_instagram,
      subscribed_youtube: row.subscribed_youtube,
      available_at_8pm: row.available_at_8pm,
      game_uid: row.game_uid,
      whatsapp_number: row.whatsapp_number,
      device_model: row.device_model,
      device_serial_last6: row.device_serial_last6,
    };
    return prefill;
  }, {});
}

export async function getWeekendCupRegistrationSummary(params?: {
  supabase?: SupabaseClient;
  userId?: string | null;
}): Promise<WeekendCupRegistrationSummary> {
  const supabase = params?.supabase ?? createServiceClient();
  const userId = params?.userId ?? null;
  let registrations: WeekendCupRegistrationRow[] = [];
  try {
    registrations = await loadWeekendCupRegistrations({ supabase });
  } catch (error) {
    if (isMissingWeekendCupRegistrationSchemaError(error)) {
      return {
        ...getWeekendCupFallbackSummary(),
        registrations: [],
      };
    }

    throw error;
  }
  const games = getWeekendCupGameRegistrationCounts();

  for (const registration of registrations) {
    if (!isWeekendCupGame(registration.game)) {
      continue;
    }

    if (registration.eligibility_status === 'disqualified') {
      continue;
    }

    const game = registration.game;
    games[game].registered += 1;

    if (isWeekendCupPaidStatus(registration.payment_status)) {
      games[game].confirmed += 1;
    }

    if (isWeekendCupPendingPaymentStatus(registration.payment_status)) {
      games[game].pendingPayment += 1;
    }

    if (
      registration.check_in_status === 'checked_in' &&
      isWeekendCupPaidStatus(registration.payment_status)
    ) {
      games[game].checkedIn += 1;
    }
  }

  for (const game of WEEKEND_CUP_GAMES) {
    const row = games[game.game];
    row.spotsLeft = Math.max(0, game.slots - row.confirmed);
    row.full = row.confirmed >= game.slots;
    row.checkInSpotsLeft = Math.max(0, game.checkInCap - row.checkedIn);
    row.checkInFull = row.checkedIn >= game.checkInCap;
  }

  const earlyBirdPaidCount = await getWeekendCupEarlyBirdPaidCount({ supabase });
  const prefill = userId
    ? await getWeekendCupRegistrationPrefill({ supabase, userId })
    : {};

  return {
    games,
    registrations: userId
      ? registrations.filter((registration) => registration.user_id === userId)
      : [],
    prefill,
    payment: {
      earlyBirdPaidCount,
      earlyBirdPaidLimit: WEEKEND_CUP_ENTRY_PRICING.earlyBirdPaidLimit,
      earlyBirdRemaining: Math.max(
        0,
        WEEKEND_CUP_ENTRY_PRICING.earlyBirdPaidLimit - earlyBirdPaidCount
      ),
    },
  };
}

function getFallbackBallotState(userId?: string | null) {
  return WEEKEND_CUP_BALLOTS.map((ballot) => ({
    id: ballot.slug,
    slug: ballot.slug,
    title: ballot.title,
    subtitle: ballot.subtitle,
    dateLabel: ballot.dateLabel,
    themeLabel: ballot.themeLabel,
    status: ballot.status,
    totalVotes: 0,
    options: ballot.options.map((option) => ({
      id: `${ballot.slug}:${option.slug}`,
      slug: option.slug,
      label: option.label,
      platform: option.platform,
      description: option.description,
      isOfficial: option.isOfficial,
      votes: 0,
      userVoted: Boolean(userId) && false,
      suggestionNote: null,
    })),
  }));
}

export async function loadWeekendCupBallotState(params?: {
  supabase?: SupabaseClient;
  userId?: string | null;
}) {
  const supabase = params?.supabase ?? createServiceClient();
  const userId = params?.userId ?? null;
  const [ballotsResult, optionsResult, votesResult] = await Promise.all([
    supabase
      .from('weekend_cup_ballots')
      .select('id, slug, title, subtitle, date_label, theme_label, cup_order, status')
      .order('cup_order', { ascending: true }),
    supabase
      .from('weekend_cup_ballot_options')
      .select(
        'id, ballot_id, slug, label, platform, description, is_official, suggested_by, suggestion_note, created_at'
      )
      .order('created_at', { ascending: true }),
    supabase
      .from('weekend_cup_ballot_votes')
      .select('ballot_option_id, user_id'),
  ]);

  if (ballotsResult.error || optionsResult.error || votesResult.error) {
    const candidateError = ballotsResult.error ?? optionsResult.error ?? votesResult.error;
    if (isMissingWeekendCupTableError(candidateError)) {
      return getFallbackBallotState(userId);
    }

    throw candidateError;
  }

  const ballots = (ballotsResult.data ?? []) as WeekendCupBallotRow[];
  const options = (optionsResult.data ?? []) as WeekendCupBallotOptionRow[];
  const votes = (votesResult.data ?? []) as WeekendCupBallotVoteRow[];

  if (!ballots.length) {
    return getFallbackBallotState(userId);
  }

  const votesByOption = votes.reduce<Record<string, number>>((counts, vote) => {
    counts[vote.ballot_option_id] = (counts[vote.ballot_option_id] ?? 0) + 1;
    return counts;
  }, {});
  const userVotes = new Set(
    votes
      .filter((vote) => userId && vote.user_id === userId)
      .map((vote) => vote.ballot_option_id)
  );

  return ballots.map((ballot) => {
    const ballotOptions = options
      .filter((option) => option.ballot_id === ballot.id)
      .map((option) => ({
        id: option.id,
        slug: option.slug,
        label: option.label,
        platform: option.platform,
        description: option.description ?? '',
        isOfficial: option.is_official,
        votes: votesByOption[option.id] ?? 0,
        userVoted: userVotes.has(option.id),
        suggestionNote: option.suggestion_note,
      }))
      .sort((left, right) => {
        if (right.votes !== left.votes) {
          return right.votes - left.votes;
        }

        return left.label.localeCompare(right.label);
      });

    return {
      id: ballot.id,
      slug: ballot.slug,
      title: ballot.title,
      subtitle: ballot.subtitle,
      dateLabel: ballot.date_label,
      themeLabel: ballot.theme_label,
      status: ballot.status,
      totalVotes: ballotOptions.reduce((sum, option) => sum + option.votes, 0),
      options: ballotOptions,
    };
  });
}

export function buildWeekendCupRegisterPayload(params: {
  row: WeekendCupRegistrationRow;
}) {
  return {
    id: params.row.id,
    game: params.row.game,
    in_game_username: params.row.in_game_username,
    instagram_username: params.row.instagram_username,
    youtube_name: params.row.youtube_name,
    followed_instagram: params.row.followed_instagram,
    subscribed_youtube: params.row.subscribed_youtube,
    reward_eligible: params.row.reward_eligible,
    eligibility_status: params.row.eligibility_status,
    check_in_status: params.row.check_in_status,
    entry_fee_kes: params.row.entry_fee_kes,
    payment_tier: params.row.payment_tier,
    payment_status: params.row.payment_status,
    payment_reference: params.row.payment_reference,
    payment_confirmed_at: params.row.payment_confirmed_at,
    payment_note: params.row.payment_note,
    game_uid: params.row.game_uid,
    whatsapp_number: params.row.whatsapp_number,
    device_model: params.row.device_model,
    device_serial_last6: params.row.device_serial_last6,
    checked_in_at: params.row.checked_in_at,
    created_at: params.row.created_at,
    updated_at: params.row.updated_at,
  } satisfies WeekendCupPlayerRegistration;
}

export async function markWeekendCupPaymentPaidByReference(
  supabase: SupabaseClient,
  reference: string
): Promise<{ success: boolean; registrationId?: string; error?: string }> {
  const { data: registrationRaw, error: registrationError } = await supabase
    .from('online_tournament_registrations')
    .select('id, payment_status')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .eq('payment_reference', reference)
    .maybeSingle();

  const registration = registrationRaw as
    | { id: string; payment_status: OnlineTournamentPaymentStatus }
    | null;

  if (registrationError || !registration) {
    return { success: false, error: 'Weekend Cup payment record not found' };
  }

  if (registration.payment_status === 'paid') {
    return { success: true, registrationId: registration.id };
  }

  const { error: updateError } = await supabase
    .from('online_tournament_registrations')
    .update({
      payment_status: 'paid',
      payment_confirmed_at: new Date().toISOString(),
      payment_note: 'Paystack payment confirmed.',
      updated_at: new Date().toISOString(),
    })
    .eq('id', registration.id)
    .in('payment_status', ['pending_payment', 'failed', 'manual_review']);

  if (updateError) {
    return { success: false, error: 'Could not confirm Weekend Cup payment' };
  }

  return { success: true, registrationId: registration.id };
}

export async function markWeekendCupPaymentFailedByReference(
  supabase: SupabaseClient,
  reference: string
): Promise<{ success: boolean; registrationId?: string; error?: string }> {
  const { data: registrationRaw, error: registrationError } = await supabase
    .from('online_tournament_registrations')
    .select('id, payment_status')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .eq('payment_reference', reference)
    .maybeSingle();

  const registration = registrationRaw as
    | { id: string; payment_status: OnlineTournamentPaymentStatus }
    | null;

  if (registrationError || !registration) {
    return { success: false, error: 'Weekend Cup payment record not found' };
  }

  if (registration.payment_status === 'paid') {
    return { success: true, registrationId: registration.id };
  }

  const { error: updateError } = await supabase
    .from('online_tournament_registrations')
    .update({
      payment_status: 'failed',
      payment_note: 'Paystack payment failed.',
      updated_at: new Date().toISOString(),
    })
    .eq('id', registration.id)
    .eq('payment_status', 'pending_payment');

  if (updateError) {
    return { success: false, error: 'Could not mark Weekend Cup payment failed' };
  }

  return { success: true, registrationId: registration.id };
}

export function getWeekendCupCapacityErrorMessage(
  game: OnlineTournamentGameKey,
  error: unknown
) {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const candidate = error as {
    code?: string;
    details?: string;
    message?: string;
  };
  const text = [candidate.code, candidate.details, candidate.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!text.includes('online_tournament_registration_cap_reached') && !text.includes('online_tournament_check_in_cap_reached')) {
    return null;
  }

  const config = WEEKEND_CUP_GAME_BY_KEY[game];
  return text.includes('check_in_cap')
    ? `${config.label} check-in is full`
    : `${config.label} confirmed slots are full`;
}
