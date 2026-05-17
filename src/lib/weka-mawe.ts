import type { SupabaseClient } from '@supabase/supabase-js';
import { makePaymentReference } from '@/lib/slug';
import { APP_URL } from '@/lib/urls';
import {
  WEKA_MAWE_ENTRY_FEE_KES,
  WEKA_MAWE_MAX_PLAYERS,
  WEKA_MAWE_REGISTER_PATH,
  WEKA_MAWE_RECORDING_ROUNDS,
  WEKA_MAWE_ROUNDS,
  isWekaMaweCheckInOpen,
  isWekaMaweRegistrationOpen,
  type WekaMaweBracketMatch,
  type WekaMaweCheckIn,
  type WekaMaweEdition,
  type WekaMaweEligibilityStatus,
  type WekaMawePaymentStatus,
  type WekaMaweRegistration,
  type WekaMaweRecordingStatus,
  type WekaMaweRoundKey,
  type WekaMaweSummary,
} from '@/lib/weka-mawe-shared';

export * from '@/lib/weka-mawe-shared';

type Db = SupabaseClient;

export async function getCurrentWekaMaweEdition(supabase: Db): Promise<WekaMaweEdition | null> {
  const { data, error } = await supabase
    .from('weka_mawe_editions')
    .select('*')
    .in('status', ['registration_open', 'check_in_open', 'locked', 'live'])
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data as WekaMaweEdition;
  }

  const fallback = await supabase
    .from('weka_mawe_editions')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return (fallback.data as WekaMaweEdition | null) ?? null;
}

export async function getWekaMaweSummary(supabase: Db, userId?: string | null): Promise<WekaMaweSummary> {
  const edition = await getCurrentWekaMaweEdition(supabase);
  if (!edition) {
    return {
      edition: null,
      registrations: [],
      checkIns: [],
      matches: [],
      totals: { registered: 0, paid: 0, pendingPayment: 0, checkedIn: 0, slotsLeft: 0 },
      userRegistration: null,
      userCheckIn: null,
    };
  }

  const [registrationsResult, checkInsResult, matchesResult] = await Promise.all([
    supabase
      .from('weka_mawe_registrations')
      .select('*, user:user_id(id, username, email, phone)')
      .eq('edition_id', edition.id)
      .order('registered_at', { ascending: true }),
    supabase
      .from('weka_mawe_check_ins')
      .select('*')
      .eq('edition_id', edition.id)
      .order('checked_in_at', { ascending: true }),
    supabase
      .from('weka_mawe_bracket_matches')
      .select('*, player_one:player_one_user_id(id, username), player_two:player_two_user_id(id, username)')
      .eq('edition_id', edition.id)
      .order('round_index', { ascending: true })
      .order('match_number', { ascending: true }),
  ]);

  if (registrationsResult.error) throw new Error(registrationsResult.error.message);
  if (checkInsResult.error) throw new Error(checkInsResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);

  const registrations = (registrationsResult.data ?? []) as WekaMaweRegistration[];
  const checkIns = (checkInsResult.data ?? []) as WekaMaweCheckIn[];
  const matches = (matchesResult.data ?? []) as WekaMaweBracketMatch[];
  const paid = registrations.filter(
    (registration) =>
      registration.payment_status === 'paid' && registration.eligibility_status !== 'disqualified'
  ).length;
  const pendingPayment = registrations.filter((registration) =>
    ['pending_payment', 'manual_review'].includes(registration.payment_status)
  ).length;

  return {
    edition,
    registrations,
    checkIns,
    matches,
    totals: {
      registered: registrations.length,
      paid,
      pendingPayment,
      checkedIn: checkIns.filter((checkIn) => checkIn.status === 'checked_in').length,
      slotsLeft: Math.max(0, edition.max_players - paid),
    },
    userRegistration: userId
      ? registrations.find((registration) => registration.user_id === userId) ?? null
      : null,
    userCheckIn: userId ? checkIns.find((checkIn) => checkIn.user_id === userId) ?? null : null,
  };
}

export async function startWekaMaweRegistration(params: {
  supabase: Db;
  userId: string;
  username: string;
  email: string;
  phone: string;
  ign: string;
  whatsappNumber: string;
}) {
  const edition = await getCurrentWekaMaweEdition(params.supabase);
  if (!edition || !isWekaMaweRegistrationOpen(edition)) {
    return { success: false, error: 'Weka Mawe registration is not open right now.' };
  }

  const summary = await getWekaMaweSummary(params.supabase, params.userId);
  if (summary.totals.slotsLeft <= 0 && !summary.userRegistration) {
    return { success: false, error: 'Weka Mawe is full for this edition.' };
  }

  if (summary.userRegistration?.payment_status === 'paid') {
    const { data, error } = await params.supabase
      .from('weka_mawe_registrations')
      .update({
        ign: params.ign,
        phone: params.phone || null,
        whatsapp_number: params.whatsappNumber || params.phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', summary.userRegistration.id)
      .select('*')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message ?? 'Could not update registration.' };
    }

    return { success: true, registration: data as WekaMaweRegistration, alreadyPaid: true };
  }

  if (
    summary.userRegistration?.payment_status === 'pending_payment' &&
    summary.userRegistration.payment_authorization_url
  ) {
    const { data, error } = await params.supabase
      .from('weka_mawe_registrations')
      .update({
        ign: params.ign,
        phone: params.phone || null,
        whatsapp_number: params.whatsappNumber || params.phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', summary.userRegistration.id)
      .select('*')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message ?? 'Could not update registration.' };
    }

    return {
      success: true,
      registration: data as WekaMaweRegistration,
      authorizationUrl: summary.userRegistration.payment_authorization_url,
      reference: summary.userRegistration.payment_reference,
      reusedPendingPayment: true,
    };
  }

  const reference = summary.userRegistration?.payment_reference || makePaymentReference('mechi_weka_mawe');
  const email = params.email || `${params.username || 'player'}@mechi.club`;
  const { initializeTournamentPayment } = await import('@/lib/paystack');
  const payment = await initializeTournamentPayment({
    amountKes: edition.registration_fee_kes,
    email,
    reference,
    callbackUrl: `${APP_URL}${WEKA_MAWE_REGISTER_PATH}`,
    metadata: {
      app: 'mechi',
      source: 'mechi',
      type: 'weka_mawe_registration',
      edition_id: edition.id,
      edition_slug: edition.slug,
      user_id: params.userId,
    },
  });

  if (!payment.success || !payment.authorizationUrl) {
    return { success: false, error: payment.error ?? 'Could not start payment.' };
  }

  const payload = {
    edition_id: edition.id,
    user_id: params.userId,
    ign: params.ign,
    phone: params.phone || null,
    whatsapp_number: params.whatsappNumber || params.phone || null,
    payment_status: 'pending_payment' as WekaMawePaymentStatus,
    amount_kes: edition.registration_fee_kes,
    payment_reference: reference,
    payment_email: email,
    payment_access_code: payment.accessCode ?? null,
    payment_authorization_url: payment.authorizationUrl,
    eligibility_status: 'pending' as WekaMaweEligibilityStatus,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await params.supabase
    .from('weka_mawe_registrations')
    .upsert(payload, { onConflict: 'edition_id,user_id' })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Could not save registration.' };
  }

  return {
    success: true,
    registration: data as WekaMaweRegistration,
    authorizationUrl: payment.authorizationUrl,
    reference,
  };
}

export async function markWekaMawePaymentPaidByReference(supabase: Db, reference: string) {
  const { data, error } = await supabase
    .from('weka_mawe_registrations')
    .update({
      payment_status: 'paid',
      eligibility_status: 'verified',
      payment_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('payment_reference', reference)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Payment record not found' };
  }

  return { success: true };
}

export async function markWekaMawePaymentFailedByReference(supabase: Db, reference: string) {
  const { data, error } = await supabase
    .from('weka_mawe_registrations')
    .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
    .eq('payment_reference', reference)
    .neq('payment_status', 'paid')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Payment record not found' };
  }

  return { success: true };
}

export async function verifyAndMarkWekaMawePayment(params: {
  supabase: Db;
  userId: string;
  reference: string;
}) {
  const { data, error } = await params.supabase
    .from('weka_mawe_registrations')
    .select('id, user_id, amount_kes, payment_status')
    .eq('payment_reference', params.reference)
    .eq('user_id', params.userId)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: 'Payment record not found.' };
  }

  if (data.payment_status === 'paid') {
    return { success: true };
  }

  const { verifyTournamentPayment } = await import('@/lib/paystack');
  const verified = await verifyTournamentPayment({
    reference: params.reference,
    expectedAmountKes: Number(data.amount_kes ?? WEKA_MAWE_ENTRY_FEE_KES),
  });

  if (!verified.success) {
    return { success: false, error: verified.error ?? 'Payment is not complete yet.' };
  }

  return markWekaMawePaymentPaidByReference(params.supabase, params.reference);
}

export async function checkInWekaMawePlayer(params: { supabase: Db; userId: string }) {
  const edition = await getCurrentWekaMaweEdition(params.supabase);
  if (!edition || !isWekaMaweCheckInOpen(edition)) {
    return { success: false, error: 'Weka Mawe check-in is not open right now.' };
  }

  const { data: registration, error } = await params.supabase
    .from('weka_mawe_registrations')
    .select('*')
    .eq('edition_id', edition.id)
    .eq('user_id', params.userId)
    .maybeSingle();

  if (error || !registration) {
    return { success: false, error: 'Register and pay before checking in.' };
  }

  if (registration.payment_status !== 'paid') {
    return { success: false, error: 'Payment must be confirmed before check-in.' };
  }

  if (registration.eligibility_status === 'disqualified') {
    return { success: false, error: 'This registration is not eligible for check-in.' };
  }

  const { data, error: checkInError } = await params.supabase
    .from('weka_mawe_check_ins')
    .upsert(
      {
        edition_id: edition.id,
        user_id: params.userId,
        registration_id: registration.id,
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'edition_id,user_id' }
    )
    .select('*')
    .single();

  if (checkInError || !data) {
    return { success: false, error: checkInError?.message ?? 'Could not check in.' };
  }

  return { success: true, checkIn: data as WekaMaweCheckIn };
}

function nextRoundFor(round: WekaMaweRoundKey) {
  const current = WEKA_MAWE_ROUNDS.find((candidate) => candidate.key === round);
  if (!current) return null;
  return WEKA_MAWE_ROUNDS.find((candidate) => candidate.index === current.index + 1) ?? null;
}

export async function generateWekaMaweBracket(supabase: Db, editionId: string) {
  const { data: registrations, error } = await supabase
    .from('weka_mawe_registrations')
    .select('id, user_id, registered_at, payment_status, eligibility_status, check_in:weka_mawe_check_ins(id)')
    .eq('edition_id', editionId)
    .eq('payment_status', 'paid')
    .neq('eligibility_status', 'disqualified')
    .order('registered_at', { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  const checkedIn = ((registrations ?? []) as Array<{
    id: string;
    user_id: string;
    check_in?: unknown[];
  }>).filter((registration) => Array.isArray(registration.check_in) && registration.check_in.length > 0);

  if (checkedIn.length < 2) {
    return { success: false, error: 'At least two checked-in paid players are needed.' };
  }

  await supabase.from('weka_mawe_bracket_matches').delete().eq('edition_id', editionId);

  const players = checkedIn.slice(0, WEKA_MAWE_MAX_PLAYERS);
  const rows = Array.from({ length: 16 }, (_, index) => {
    const one = players[index * 2] ?? null;
    const two = players[index * 2 + 1] ?? null;
    const winner = one && !two ? one : null;

    return {
      edition_id: editionId,
      round_key: 'round_of_32' as WekaMaweRoundKey,
      round_index: 1,
      match_number: index + 1,
      seed_one: index * 2 + 1,
      seed_two: index * 2 + 2,
      player_one_registration_id: one?.id ?? null,
      player_two_registration_id: two?.id ?? null,
      player_one_user_id: one?.user_id ?? null,
      player_two_user_id: two?.user_id ?? null,
      winner_registration_id: winner?.id ?? null,
      winner_user_id: winner?.user_id ?? null,
      status: winner ? 'completed' : one && two ? 'ready' : 'pending',
      completed_at: winner ? new Date().toISOString() : null,
      next_match_number: Math.floor(index / 2) + 1,
      next_player_slot: (index % 2) + 1,
      recording_expected: false,
      recording_status: 'not_required' as WekaMaweRecordingStatus,
    };
  });

  const { error: insertError } = await supabase.from('weka_mawe_bracket_matches').insert(rows);
  if (insertError) {
    return { success: false, error: insertError.message };
  }

  await supabase
    .from('weka_mawe_editions')
    .update({ status: 'locked', bracket_locked: true, updated_at: new Date().toISOString() })
    .eq('id', editionId);

  for (const row of rows) {
    if (row.winner_registration_id) {
      await advanceWekaMaweWinner(supabase, {
        editionId,
        roundKey: row.round_key,
        matchNumber: row.match_number,
        winnerRegistrationId: row.winner_registration_id,
      });
    }
  }

  return { success: true };
}

export async function advanceWekaMaweWinner(
  supabase: Db,
  params: {
    editionId: string;
    roundKey: WekaMaweRoundKey;
    matchNumber: number;
    winnerRegistrationId: string;
  }
) {
  const round = WEKA_MAWE_ROUNDS.find((candidate) => candidate.key === params.roundKey);
  const nextRound = nextRoundFor(params.roundKey);
  if (!round || !nextRound) {
    return { success: true };
  }

  const nextMatchNumber = Math.floor((params.matchNumber - 1) / 2) + 1;
  const nextPlayerSlot = ((params.matchNumber - 1) % 2) + 1;
  const { data: winnerRegistration } = await supabase
    .from('weka_mawe_registrations')
    .select('id, user_id')
    .eq('id', params.winnerRegistrationId)
    .maybeSingle();

  if (!winnerRegistration) {
    return { success: false, error: 'Winner registration was not found.' };
  }

  const recordingExpected = WEKA_MAWE_RECORDING_ROUNDS.has(nextRound.key);
  const existing = await supabase
    .from('weka_mawe_bracket_matches')
    .select('*')
    .eq('edition_id', params.editionId)
    .eq('round_key', nextRound.key)
    .eq('match_number', nextMatchNumber)
    .maybeSingle();

  const updates =
    nextPlayerSlot === 1
      ? {
          player_one_registration_id: winnerRegistration.id,
          player_one_user_id: winnerRegistration.user_id,
        }
      : {
          player_two_registration_id: winnerRegistration.id,
          player_two_user_id: winnerRegistration.user_id,
        };

  if (existing.data) {
    const nextStatus =
      (updates as { player_one_registration_id?: string }).player_one_registration_id ||
      existing.data.player_one_registration_id
        ? (updates as { player_two_registration_id?: string }).player_two_registration_id ||
          existing.data.player_two_registration_id
          ? 'ready'
          : existing.data.status
        : existing.data.status;
    const { error } = await supabase
      .from('weka_mawe_bracket_matches')
      .update({ ...updates, status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', existing.data.id);
    return error ? { success: false, error: error.message } : { success: true };
  }

  const { error } = await supabase.from('weka_mawe_bracket_matches').insert({
    edition_id: params.editionId,
    round_key: nextRound.key,
    round_index: nextRound.index,
    match_number: nextMatchNumber,
    ...updates,
    status: 'pending',
    next_match_number:
      nextRound.key === 'final' ? null : Math.floor((nextMatchNumber - 1) / 2) + 1,
    next_player_slot: nextRound.key === 'final' ? null : ((nextMatchNumber - 1) % 2) + 1,
    recording_expected: recordingExpected,
    recording_status: recordingExpected ? 'expected' : 'not_required',
  });

  return error ? { success: false, error: error.message } : { success: true };
}

export function getWinnerRegistrationIdFromScore(
  match: Pick<WekaMaweBracketMatch, 'player_one_registration_id' | 'player_two_registration_id'>,
  playerOneScore: number,
  playerTwoScore: number
) {
  if (playerOneScore === playerTwoScore) return null;
  return playerOneScore > playerTwoScore
    ? match.player_one_registration_id
    : match.player_two_registration_id;
}
