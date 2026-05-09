import { after, NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  ONLINE_TOURNAMENT_DISPUTE_API_PATH,
  ONLINE_TOURNAMENT_DISPUTE_CATEGORIES,
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  ONLINE_TOURNAMENT_SLUG,
  isOnlineTournamentDisputeCategory,
  isOnlineTournamentGame,
  type OnlineTournamentDisputeCategory,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { sendOnlineTournamentDisputeTelegramNotification } from '@/lib/telegram';

export const runtime = 'nodejs';

type RegistrationRow = {
  id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  check_in_status: string;
  eligibility_status: string;
};

type SubmissionRow = {
  id: string;
  game: OnlineTournamentGameKey;
  registration_id: string | null;
  fixture_id: string | null;
  match_number: number | null;
  kills: number | null;
  placement: number | null;
  player1_score: number | null;
  player2_score: number | null;
  status: string;
  created_at: string;
};

type FixtureRelation = {
  in_game_username?: string | null;
} | null;

type FixtureRow = {
  id: string;
  game: OnlineTournamentGameKey;
  round_label: string;
  slot: number;
  status: string;
  player1_registration_id: string | null;
  player2_registration_id: string | null;
  player1?: FixtureRelation;
  player2?: FixtureRelation;
};

type DisputeRow = {
  id: string;
  event_slug: string;
  game: OnlineTournamentGameKey;
  category: OnlineTournamentDisputeCategory;
  title: string | null;
  result_submission_id: string | null;
  fixture_id: string | null;
  opened_by: string | null;
  reason: string | null;
  reporter_contact: string | null;
  evidence_url: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const DISPUTE_SELECT =
  'id, event_slug, game, category, title, result_submission_id, fixture_id, opened_by, reason, reporter_contact, evidence_url, status, resolution_note, resolved_by, resolved_at, metadata, created_at, updated_at';

const CATEGORY_LABELS = new Map(
  ONLINE_TOURNAMENT_DISPUTE_CATEGORIES.map((category) => [category.value, category.label])
);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value: unknown, maxLength = 120) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanLongText(value: unknown, maxLength = 2400) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function cleanOptionalUuid(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return UUID_REGEX.test(text) ? text : null;
}

function cleanOptionalUrl(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString().slice(0, 500);
  } catch {
    return null;
  }
}

function formatSubmissionLabel(
  submission: SubmissionRow,
  fixtureLabelById: Map<string, string>
) {
  if (submission.match_number) {
    return `Match ${submission.match_number} | ${submission.kills ?? 0} kills | placement #${
      submission.placement ?? '-'
    }`;
  }

  const scoreline =
    submission.player1_score !== null && submission.player2_score !== null
      ? `${submission.player1_score}-${submission.player2_score}`
      : 'Score submitted';
  const fixtureLabel = submission.fixture_id
    ? fixtureLabelById.get(submission.fixture_id)
    : null;

  return fixtureLabel ? `${fixtureLabel} | ${scoreline}` : scoreline;
}

function formatFixtureLabel(fixture: FixtureRow) {
  const player1Name = fixture.player1?.in_game_username?.trim() || 'TBA';
  const player2Name = fixture.player2?.in_game_username?.trim() || 'TBA';
  return `${fixture.round_label} | ${player1Name} vs ${player2Name}`;
}

async function loadDisputeIntakeState(supabase: SupabaseClient, userId: string) {
  const { data: registrationsRaw, error: registrationsError } = await supabase
    .from('online_tournament_registrations')
    .select('id, game, in_game_username, check_in_status, eligibility_status')
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (registrationsError) {
    throw registrationsError;
  }

  const registrations = (registrationsRaw ?? []) as RegistrationRow[];
  const registrationIds = registrations.map((registration) => registration.id);
  const userRegistrationIds = new Set(registrationIds);

  const disputesQuery = supabase
    .from('online_tournament_disputes')
    .select(DISPUTE_SELECT)
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .eq('opened_by', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (registrationIds.length === 0) {
    const { data: disputesRaw, error: disputesError } = await disputesQuery;

    if (disputesError) {
      throw disputesError;
    }

    return {
      registrations: [],
      submissions: [],
      fixtures: [],
      disputes: ((disputesRaw ?? []) as DisputeRow[]).map((dispute) => ({
        id: dispute.id,
        game: dispute.game,
        game_label: ONLINE_TOURNAMENT_GAME_BY_KEY[dispute.game].label,
        category: dispute.category,
        category_label: CATEGORY_LABELS.get(dispute.category) ?? dispute.category,
        title: dispute.title ?? 'Tournament issue',
        reporter_contact: dispute.reporter_contact,
        evidence_url: dispute.evidence_url,
        status: dispute.status,
        reason: dispute.reason ?? '',
        related_label: null,
        created_at: dispute.created_at,
      })),
    };
  }

  const [submissionsResult, fixturesResult, disputesResult] = await Promise.all([
    supabase
      .from('online_tournament_result_submissions')
      .select(
        'id, game, registration_id, fixture_id, match_number, kills, placement, player1_score, player2_score, status, created_at'
      )
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .in('registration_id', registrationIds)
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('online_tournament_fixtures')
      .select(
        'id, game, round_label, slot, status, player1_registration_id, player2_registration_id, player1:player1_registration_id(in_game_username), player2:player2_registration_id(in_game_username)'
      )
      .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
      .eq('game', 'efootball')
      .order('round', { ascending: true })
      .order('slot', { ascending: true }),
    disputesQuery,
  ]);

  if (submissionsResult.error) {
    throw submissionsResult.error;
  }

  if (fixturesResult.error) {
    throw fixturesResult.error;
  }

  if (disputesResult.error) {
    throw disputesResult.error;
  }

  const relevantFixtures = ((fixturesResult.data ?? []) as FixtureRow[]).filter(
    (fixture) =>
      (fixture.player1_registration_id &&
        userRegistrationIds.has(fixture.player1_registration_id)) ||
      (fixture.player2_registration_id && userRegistrationIds.has(fixture.player2_registration_id))
  );
  const fixtureLabelById = new Map<string, string>();

  const fixtures = relevantFixtures.map((fixture) => {
    const label = formatFixtureLabel(fixture);
    fixtureLabelById.set(fixture.id, label);

    return {
      id: fixture.id,
      game: fixture.game,
      game_label: ONLINE_TOURNAMENT_GAME_BY_KEY[fixture.game].label,
      label,
      status: fixture.status,
    };
  });

  const submissions = ((submissionsResult.data ?? []) as SubmissionRow[]).map((submission) => ({
    id: submission.id,
    game: submission.game,
    game_label: ONLINE_TOURNAMENT_GAME_BY_KEY[submission.game].label,
    label: formatSubmissionLabel(submission, fixtureLabelById),
    status: submission.status,
    fixture_id: submission.fixture_id,
    created_at: submission.created_at,
  }));
  const submissionLabelById = new Map(submissions.map((submission) => [submission.id, submission.label]));

  const disputes = ((disputesResult.data ?? []) as DisputeRow[]).map((dispute) => ({
    id: dispute.id,
    game: dispute.game,
    game_label: ONLINE_TOURNAMENT_GAME_BY_KEY[dispute.game].label,
    category: dispute.category,
    category_label: CATEGORY_LABELS.get(dispute.category) ?? dispute.category,
    title: dispute.title ?? 'Tournament issue',
    reporter_contact: dispute.reporter_contact,
    evidence_url: dispute.evidence_url,
    status: dispute.status,
    reason: dispute.reason ?? '',
    related_label:
      (dispute.fixture_id ? fixtureLabelById.get(dispute.fixture_id) : null) ??
      (dispute.result_submission_id ? submissionLabelById.get(dispute.result_submission_id) : null) ??
      null,
    created_at: dispute.created_at,
  }));

  return {
    registrations: registrations.map((registration) => ({
      id: registration.id,
      game: registration.game,
      game_label: ONLINE_TOURNAMENT_GAME_BY_KEY[registration.game].label,
      in_game_username: registration.in_game_username,
      check_in_status: registration.check_in_status,
      eligibility_status: registration.eligibility_status,
    })),
    submissions,
    fixtures,
    disputes,
  };
}

async function getUserRegistrationsForGame(
  supabase: SupabaseClient,
  params: { userId: string; game: OnlineTournamentGameKey }
) {
  const { data, error } = await supabase
    .from('online_tournament_registrations')
    .select('id, in_game_username')
    .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
    .eq('user_id', params.userId)
    .eq('game', params.game);

  if (error) {
    throw error;
  }

  return (data ?? []) as Array<{ id: string; in_game_username: string }>;
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const supabase = createServiceClient();
    return NextResponse.json(await loadDisputeIntakeState(supabase, access.profile.id));
  } catch (error) {
    console.error('[OnlineTournamentDisputes GET] Error:', error);
    return NextResponse.json(
      { error: 'Could not load the dispute form right now' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const rateLimit = await checkPersistentRateLimit(
      `online-tournament-dispute:${access.profile.id}:${getClientIp(request)}`,
      6,
      30 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const game = String(body.game ?? '').trim();
    const category = String(body.category ?? '').trim();
    const title = cleanText(body.title, 120);
    const reason = cleanLongText(body.reason, 2400);
    const reporterContact = cleanText(body.reporter_contact, 120);
    const evidenceUrlInput = String(body.evidence_url ?? '').trim();
    const evidenceUrl = cleanOptionalUrl(body.evidence_url);
    const resultSubmissionId = cleanOptionalUuid(body.result_submission_id);
    const fixtureId = cleanOptionalUuid(body.fixture_id);

    if (!isOnlineTournamentGame(game)) {
      return NextResponse.json({ error: 'Pick the tournament game first' }, { status: 400 });
    }

    if (!isOnlineTournamentDisputeCategory(category)) {
      return NextResponse.json({ error: 'Pick the issue type' }, { status: 400 });
    }

    if (title.length < 4) {
      return NextResponse.json(
        { error: 'Add a short title so ops can scan the issue fast' },
        { status: 400 }
      );
    }

    if (reason.length < 20) {
      return NextResponse.json(
        { error: 'Add enough detail to explain what went wrong' },
        { status: 400 }
      );
    }

    if (reporterContact.length < 6) {
      return NextResponse.json(
        { error: 'Add a WhatsApp number, phone number, or email for follow-up' },
        { status: 400 }
      );
    }

    if (evidenceUrlInput && !evidenceUrl) {
      return NextResponse.json(
        { error: 'Evidence link must start with http:// or https://' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const registrations = await getUserRegistrationsForGame(supabase, {
      userId: access.profile.id,
      game,
    });

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: 'Register for this PlayMechi game before opening a dispute' },
        { status: 403 }
      );
    }

    const userRegistrationIds = new Set(registrations.map((registration) => registration.id));
    let validatedSubmission:
      | Pick<SubmissionRow, 'id' | 'game' | 'fixture_id' | 'status'>
      | null = null;
    let validatedFixture: Pick<FixtureRow, 'id' | 'game' | 'status' | 'round_label' | 'slot'> | null = null;

    if (resultSubmissionId) {
      const { data: submissionRaw, error: submissionError } = await supabase
        .from('online_tournament_result_submissions')
        .select('id, game, registration_id, fixture_id, status')
        .eq('id', resultSubmissionId)
        .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
        .maybeSingle();

      const submission = submissionRaw as
        | {
            id: string;
            game: OnlineTournamentGameKey;
            registration_id: string | null;
            fixture_id: string | null;
            status: string;
          }
        | null;

      if (
        submissionError ||
        !submission ||
        submission.game !== game ||
        !submission.registration_id ||
        !userRegistrationIds.has(submission.registration_id)
      ) {
        return NextResponse.json(
          { error: 'Pick one of your own result submissions or leave that field empty' },
          { status: 400 }
        );
      }

      validatedSubmission = submission;
    }

    if (fixtureId) {
      const { data: fixtureRaw, error: fixtureError } = await supabase
        .from('online_tournament_fixtures')
        .select('id, game, status, round_label, slot, player1_registration_id, player2_registration_id')
        .eq('id', fixtureId)
        .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
        .maybeSingle();

      const fixture = fixtureRaw as
        | {
            id: string;
            game: OnlineTournamentGameKey;
            status: string;
            round_label: string;
            slot: number;
            player1_registration_id: string | null;
            player2_registration_id: string | null;
          }
        | null;

      if (
        fixtureError ||
        !fixture ||
        fixture.game !== game ||
        (!fixture.player1_registration_id ||
          !userRegistrationIds.has(fixture.player1_registration_id)) &&
          (!fixture.player2_registration_id ||
            !userRegistrationIds.has(fixture.player2_registration_id))
      ) {
        return NextResponse.json(
          { error: 'Pick one of your own fixtures or leave that field empty' },
          { status: 400 }
        );
      }

      validatedFixture = fixture;
    }

    const createdAt = new Date().toISOString();
    const { data: disputeRaw, error: disputeError } = await supabase
      .from('online_tournament_disputes')
      .insert({
        event_slug: ONLINE_TOURNAMENT_SLUG,
        game,
        category,
        title,
        result_submission_id: validatedSubmission?.id ?? null,
        fixture_id: validatedFixture?.id ?? validatedSubmission?.fixture_id ?? null,
        opened_by: access.profile.id,
        reason,
        reporter_contact: reporterContact,
        evidence_url: evidenceUrl,
        status: 'open',
        metadata: {
          source: 'playmechi_createdispute',
          route: ONLINE_TOURNAMENT_DISPUTE_API_PATH,
          host: request.headers.get('host') ?? null,
          referer: request.headers.get('referer') ?? null,
          user_agent: request.headers.get('user-agent') ?? null,
        },
        updated_at: createdAt,
      })
      .select(DISPUTE_SELECT)
      .single();

    if (disputeError || !disputeRaw) {
      console.error('[OnlineTournamentDisputes POST] Insert error:', disputeError);
      return NextResponse.json(
        { error: 'Could not save the dispute report right now' },
        { status: 500 }
      );
    }

    const relatedReference =
      validatedFixture
        ? `${validatedFixture.round_label} slot ${validatedFixture.slot + 1}`
        : validatedSubmission?.id
          ? `Submission ${validatedSubmission.id.slice(0, 8)}`
          : null;

    after(async () => {
      try {
        await sendOnlineTournamentDisputeTelegramNotification({
          username: access.profile.username,
          game,
          category,
          title,
          reason,
          reporterContact,
          evidenceUrl,
          disputeId: String((disputeRaw as DisputeRow).id),
          relatedReference,
        });
      } catch (notificationError) {
        console.error(
          '[OnlineTournamentDisputes POST] Telegram notification error:',
          notificationError
        );
      }
    });

    return NextResponse.json(await loadDisputeIntakeState(supabase, access.profile.id), {
      status: 201,
    });
  } catch (error) {
    console.error('[OnlineTournamentDisputes POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
