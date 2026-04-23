import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { E2EEnvironment } from './env';
import {
  DEFAULT_PASSWORD,
  SCENARIO_IDS,
  SEEDED_PERSONAS,
  type SeededPersona,
  type SeededPersonaKey,
} from './personas';
import {
  buildAnonymousStorageState,
  buildAuthenticatedStorageState,
  writeStorageStateFile,
} from './storage-state';

type SeedClient = SupabaseClient;

export type QueueEntryInput = {
  id?: string;
  userId: string;
  game: string;
  platform?: string | null;
  region: string;
  rating?: number;
  status?: 'waiting' | 'matched' | 'cancelled';
};

export type MatchInput = {
  id?: string;
  player1Id: string;
  player2Id: string;
  game: string;
  platform?: string | null;
  region: string;
  status?: 'pending' | 'completed' | 'disputed' | 'cancelled';
  winnerId?: string | null;
  player1Score?: number | null;
  player2Score?: number | null;
  completedAt?: string | null;
  disputeRequestedBy?: string | null;
};

export type MatchMessageInput = {
  id?: string;
  matchId: string;
  senderUserId?: string | null;
  senderType: 'player' | 'system' | 'admin';
  messageType?: 'text' | 'system' | 'quick_reply';
  body?: string | null;
  meta?: Record<string, unknown>;
};

export type ChallengeInput = {
  id?: string;
  challengerId: string;
  opponentId: string;
  game: string;
  platform: string;
  status?: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  message?: string | null;
  matchId?: string | null;
  expiresAt?: string;
};

export type LobbyInput = {
  id?: string;
  hostId: string;
  game: string;
  visibility?: 'public' | 'private';
  mode: string;
  title: string;
  roomCode?: string;
  maxPlayers?: number;
  status?: 'open' | 'full' | 'in_progress' | 'closed';
  scheduledFor?: string | null;
  members?: string[];
};

export type TournamentInput = {
  id?: string;
  organizerId: string;
  slug: string;
  title: string;
  game: string;
  platform?: string | null;
  region: string;
  size: 4 | 8 | 16;
  entryFee?: number;
  prizePoolMode?: 'auto' | 'specified';
  prizePool?: number;
  status?: 'open' | 'full' | 'active' | 'completed' | 'cancelled';
  scheduledFor?: string | null;
  joinedUserIds?: string[];
};

export type LiveStreamInput = {
  id?: string;
  tournamentId?: string | null;
  matchId?: string | null;
  streamerId: string;
  muxStreamId?: string;
  muxPlaybackId?: string;
  status?: 'idle' | 'active' | 'ended';
  title: string;
  viewerCount?: number;
  startedAt?: string | null;
  endedAt?: string | null;
  recordingPlaybackId?: string | null;
};

export type NotificationInput = {
  id?: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
  readAt?: string | null;
};

export type SupportThreadInput = {
  id?: string;
  channel?: 'whatsapp' | 'instagram';
  userId?: string | null;
  phone?: string | null;
  waId: string;
  contactName?: string | null;
  status?: 'open' | 'waiting_on_ai' | 'waiting_on_human' | 'resolved' | 'blocked';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string | null;
  messages?: Array<{
    id?: string;
    direction: 'inbound' | 'outbound';
    senderType: 'user' | 'ai' | 'admin' | 'system';
    body: string;
    messageType?: string;
    providerMessageId?: string | null;
    meta?: Record<string, unknown>;
  }>;
};

export type RewardReviewInput = {
  id?: string;
  userId?: string | null;
  reason: string;
  status?: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  metadata?: Record<string, unknown>;
};

export type BountyInput = {
  id?: string;
  title: string;
  description: string;
  triggerType: string;
  prizeKes: 50 | 100 | 200;
  status?: 'draft' | 'active' | 'claimed' | 'cancelled';
  winnerId?: string | null;
  claimedAt?: string | null;
  paidAt?: string | null;
  activatedAt?: string | null;
  weekLabel: string;
  triggerMetadata?: Record<string, unknown>;
  claimAttempts?: Array<{
    id?: string;
    userId: string;
    won?: boolean;
    attemptedAt?: string;
  }>;
};

export type SuggestionInput = {
  id?: string;
  userId: string;
  gameName: string;
  description: string;
  status?: 'pending' | 'approved' | 'rejected';
  voterIds?: string[];
};

const RESET_TABLES = [
  'admin_audit_logs',
  'bounty_claim_attempts',
  'bounties',
  'reward_review_queue',
  'reward_redemptions',
  'reward_link_sessions',
  'referral_conversions',
  'reward_events',
  'auth_action_tokens',
  'match_message_reads',
  'match_messages',
  'match_escalations',
  'notifications',
  'match_challenges',
  'tournament_matches',
  'tournament_players',
  'tournaments',
  'stream_watch_sessions',
  'live_streams',
  'lobby_members',
  'lobbies',
  'support_messages',
  'support_threads',
  'matches',
  'queue',
  'suggestion_votes',
  'suggestions',
  'match_usage',
  'subscriptions',
  'profiles',
] as const;

const RESET_FILTER_COLUMN_BY_TABLE: Partial<
  Record<(typeof RESET_TABLES)[number], string>
> = {
  match_message_reads: 'match_id',
};

function assertNoError(error: { message?: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message ?? 'unknown error'}`);
  }
}

function nowMinusDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function nowPlusDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function createE2ESupabaseClient(environment: E2EEnvironment): SeedClient {
  return createClient(environment.supabaseUrl, environment.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function deleteAllRows(client: SeedClient, table: (typeof RESET_TABLES)[number]) {
  const filterColumn = RESET_FILTER_COLUMN_BY_TABLE[table] ?? 'id';
  const { error } = await client.from(table).delete().not(filterColumn, 'is', null);
  assertNoError(error, `Failed to reset ${table}`);
}

export async function resetE2EDatabase(client: SeedClient): Promise<void> {
  for (const table of RESET_TABLES) {
    await deleteAllRows(client, table);
  }
}

function buildProfileInsert(
  persona: SeededPersona,
  passwordHash: string
) {
  const planSince = persona.plan === 'free' ? null : nowMinusDays(5);
  const planExpiresAt = persona.plan === 'free' ? null : nowPlusDays(25);

  return {
    id: persona.id,
    username: persona.username,
    phone: persona.phone,
    email: persona.email,
    invite_code: persona.inviteCode,
    invited_by: null,
    avatar_url: null,
    cover_url: null,
    password_hash: passwordHash,
    country: persona.country,
    region: persona.region,
    plan: persona.plan,
    plan_since: planSince,
    plan_expires_at: planExpiresAt,
    platforms: persona.platforms,
    game_ids: persona.gameIds,
    selected_games: persona.selectedGames,
    rating_efootball: 1000,
    rating_efootball_mobile: 1000,
    rating_fc26: 1000,
    rating_mk11: 1000,
    rating_nba2k26: 1000,
    rating_tekken8: 1000,
    rating_sf6: 1000,
    rating_ludo: 1000,
    wins_efootball: 0,
    wins_efootball_mobile: 0,
    wins_fc26: 0,
    wins_mk11: 0,
    wins_nba2k26: 0,
    wins_tekken8: 0,
    wins_sf6: 0,
    wins_ludo: 0,
    losses_efootball: 0,
    losses_efootball_mobile: 0,
    losses_fc26: 0,
    losses_mk11: 0,
    losses_nba2k26: 0,
    losses_tekken8: 0,
    losses_sf6: 0,
    losses_ludo: 0,
    role: persona.role,
    is_banned: Boolean(persona.isBanned),
    ban_reason: persona.banReason ?? null,
    banned_at: persona.isBanned ? new Date().toISOString() : null,
    banned_by: null,
    whatsapp_number: persona.whatsappNumber,
    whatsapp_notifications: persona.whatsappNotifications,
    xp: persona.xp ?? 0,
    level: persona.level ?? 1,
    mp: persona.mp ?? 0,
    win_streak: 0,
    max_win_streak: 0,
    reward_points_available: persona.rewardPointsAvailable ?? 0,
    reward_points_pending: persona.rewardPointsPending ?? 0,
    reward_points_lifetime: persona.rewardPointsLifetime ?? 0,
    chezahub_user_id: persona.chezahubUserId ?? null,
    chezahub_linked_at: persona.chezahubUserId ? nowMinusDays(2) : null,
  };
}

function buildAuthUser(persona: SeededPersona) {
  return {
    id: persona.id,
    username: persona.username,
    phone: persona.phone,
    email: persona.email,
    invite_code: persona.inviteCode,
    invited_by: null,
    avatar_url: null,
    cover_url: null,
    country: persona.country,
    region: persona.region,
    platforms: persona.platforms,
    game_ids: persona.gameIds,
    selected_games: persona.selectedGames,
    role: persona.role,
    is_banned: Boolean(persona.isBanned),
    whatsapp_number: persona.whatsappNumber,
    whatsapp_notifications: persona.whatsappNotifications,
    xp: persona.xp ?? 0,
    level: persona.level ?? 1,
    mp: persona.mp ?? 0,
    win_streak: 0,
    max_win_streak: 0,
    reward_points_available: persona.rewardPointsAvailable ?? 0,
    reward_points_pending: persona.rewardPointsPending ?? 0,
    reward_points_lifetime: persona.rewardPointsLifetime ?? 0,
    chezahub_user_id: persona.chezahubUserId ?? null,
    chezahub_linked_at: persona.chezahubUserId ? nowMinusDays(2) : null,
    plan: persona.plan,
    plan_since: persona.plan === 'free' ? null : nowMinusDays(5),
    plan_expires_at: persona.plan === 'free' ? null : nowPlusDays(25),
  };
}

async function seedProfiles(client: SeedClient) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const payload = Object.values(SEEDED_PERSONAS).map((persona) =>
    buildProfileInsert(persona, passwordHash)
  );

  const { error } = await client.from('profiles').insert(payload);
  assertNoError(error, 'Failed to seed profiles');

  const subscriptions = Object.values(SEEDED_PERSONAS)
    .filter((persona) => persona.plan !== 'free')
    .map((persona) => ({
      id: randomUUID(),
      user_id: persona.id,
      plan: persona.plan,
      billing_cycle: 'monthly',
      amount_kes: persona.plan === 'elite' ? 2500 : 1000,
      status: 'active',
      paystack_ref: `e2e-sub-${persona.username}`,
      started_at: nowMinusDays(5),
      expires_at: nowPlusDays(25),
      cancelled_at: null,
    }));

  if (subscriptions.length > 0) {
    const { error: subscriptionError } = await client.from('subscriptions').insert(subscriptions);
    assertNoError(subscriptionError, 'Failed to seed subscriptions');
  }
}

export async function createQueueEntry(client: SeedClient, input: QueueEntryInput) {
  const { error } = await client.from('queue').insert({
    id: input.id ?? randomUUID(),
    user_id: input.userId,
    game: input.game,
    platform: input.platform ?? null,
    region: input.region,
    rating: input.rating ?? 1000,
    status: input.status ?? 'waiting',
  });

  assertNoError(error, 'Failed to create queue entry');
}

export async function createMatch(client: SeedClient, input: MatchInput): Promise<string> {
  const matchId = input.id ?? randomUUID();
  const { error } = await client.from('matches').insert({
    id: matchId,
    player1_id: input.player1Id,
    player2_id: input.player2Id,
    game: input.game,
    platform: input.platform ?? null,
    region: input.region,
    status: input.status ?? 'pending',
    winner_id: input.winnerId ?? null,
    player1_score: input.player1Score ?? null,
    player2_score: input.player2Score ?? null,
    completed_at: input.completedAt ?? null,
    dispute_requested_by: input.disputeRequestedBy ?? null,
    player1_reported_winner: input.winnerId ?? null,
    player2_reported_winner: input.winnerId ?? null,
  });

  assertNoError(error, 'Failed to create match');
  return matchId;
}

export async function createMatchChatMessage(
  client: SeedClient,
  input: MatchMessageInput
): Promise<void> {
  const { error } = await client.from('match_messages').insert({
    id: input.id ?? randomUUID(),
    match_id: input.matchId,
    sender_user_id: input.senderUserId ?? null,
    sender_type: input.senderType,
    message_type: input.messageType ?? 'text',
    body: input.body ?? null,
    meta: input.meta ?? {},
  });

  assertNoError(error, 'Failed to create match message');
}

export async function createChallenge(client: SeedClient, input: ChallengeInput): Promise<void> {
  const { error } = await client.from('match_challenges').insert({
    id: input.id ?? randomUUID(),
    challenger_id: input.challengerId,
    opponent_id: input.opponentId,
    game: input.game,
    platform: input.platform,
    status: input.status ?? 'pending',
    message: input.message ?? null,
    match_id: input.matchId ?? null,
    expires_at: input.expiresAt ?? nowPlusDays(1),
  });

  assertNoError(error, 'Failed to create challenge');
}

export async function createLobby(client: SeedClient, input: LobbyInput): Promise<void> {
  const lobbyId = input.id ?? randomUUID();
  const roomCode = input.roomCode ?? `E2E${lobbyId.slice(0, 6).toUpperCase()}`;
  const memberIds = [input.hostId, ...(input.members ?? [])];

  const { error: lobbyError } = await client.from('lobbies').insert({
    id: lobbyId,
    host_id: input.hostId,
    game: input.game,
    visibility: input.visibility ?? 'public',
    mode: input.mode,
    title: input.title,
    room_code: roomCode,
    max_players: input.maxPlayers ?? 4,
    status: input.status ?? 'open',
    scheduled_for: input.scheduledFor ?? null,
  });
  assertNoError(lobbyError, 'Failed to create lobby');

  const { error: memberError } = await client.from('lobby_members').insert(
    memberIds.map((userId) => ({
      id: randomUUID(),
      lobby_id: lobbyId,
      user_id: userId,
    }))
  );
  assertNoError(memberError, 'Failed to create lobby members');
}

export async function createTournament(
  client: SeedClient,
  input: TournamentInput
): Promise<string> {
  const tournamentId = input.id ?? randomUUID();
  const { error: tournamentError } = await client.from('tournaments').insert({
    id: tournamentId,
    slug: input.slug,
    title: input.title,
    game: input.game,
    platform: input.platform ?? null,
    region: input.region,
    size: input.size,
    entry_fee: input.entryFee ?? 0,
    prize_pool_mode:
      input.prizePoolMode ?? ((input.prizePool ?? 0) > 0 ? 'specified' : 'auto'),
    prize_pool: input.prizePool ?? 0,
    platform_fee: 0,
    platform_fee_rate: 0,
    status: input.status ?? 'open',
    organizer_id: input.organizerId,
    approval_status: 'approved',
    approved_at: nowMinusDays(1),
    approved_by: SEEDED_PERSONAS.admin.id,
    is_featured: true,
    payout_status: 'none',
    scheduled_for: input.scheduledFor ?? null,
  });
  assertNoError(tournamentError, 'Failed to create tournament');

  const joinedUsers = Array.from(
    new Set([input.organizerId, ...(input.joinedUserIds ?? [])])
  );

  if (joinedUsers.length > 0) {
    const { error: playerError } = await client.from('tournament_players').insert(
      joinedUsers.map((userId, index) => ({
        id: randomUUID(),
        tournament_id: tournamentId,
        user_id: userId,
        seed: index + 1,
        payment_status: (input.entryFee ?? 0) > 0 ? 'paid' : 'free',
        payment_ref: `e2e-tournament-${input.slug}-${index + 1}`,
        payment_access_code: null,
      }))
    );
    assertNoError(playerError, 'Failed to create tournament players');
  }

  return tournamentId;
}

export async function createLiveStream(
  client: SeedClient,
  input: LiveStreamInput
): Promise<string> {
  const streamId = input.id ?? randomUUID();
  const now = new Date().toISOString();
  const { error } = await client.from('live_streams').insert({
    id: streamId,
    tournament_id: input.tournamentId ?? null,
    match_id: input.matchId ?? null,
    streamer_id: input.streamerId,
    mux_stream_id: input.muxStreamId ?? `mux-live-${streamId}`,
    mux_playback_id: input.muxPlaybackId ?? `playback-${streamId}`,
    status: input.status ?? 'idle',
    title: input.title,
    viewer_count: input.viewerCount ?? 0,
    started_at: input.startedAt ?? null,
    ended_at: input.endedAt ?? null,
    recording_playback_id: input.recordingPlaybackId ?? null,
    updated_at: now,
  });

  assertNoError(error, 'Failed to create live stream');
  return streamId;
}

export async function createNotification(
  client: SeedClient,
  input: NotificationInput
): Promise<void> {
  const { error } = await client.from('notifications').insert({
    id: input.id ?? randomUUID(),
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    href: input.href ?? null,
    metadata: input.metadata ?? {},
    read_at: input.readAt ?? null,
  });

  assertNoError(error, 'Failed to create notification');
}

export async function createSupportThread(
  client: SeedClient,
  input: SupportThreadInput
): Promise<void> {
  const threadId = input.id ?? randomUUID();
  const now = new Date().toISOString();

  const { error: threadError } = await client.from('support_threads').insert({
    id: threadId,
    channel: input.channel ?? 'whatsapp',
    phone: input.phone ?? null,
    wa_id: input.waId,
    contact_name: input.contactName ?? null,
    user_id: input.userId ?? null,
    status: input.status ?? 'open',
    priority: input.priority ?? 'normal',
    assigned_to: input.assignedTo ?? SEEDED_PERSONAS.admin.id,
    escalation_reason: null,
    last_message_at: now,
    last_ai_reply_at: null,
    updated_at: now,
  });
  assertNoError(threadError, 'Failed to create support thread');

  if ((input.messages ?? []).length > 0) {
    const { error: messageError } = await client.from('support_messages').insert(
      (input.messages ?? []).map((message, index) => ({
        id: message.id ?? randomUUID(),
        thread_id: threadId,
        direction: message.direction,
        sender_type: message.senderType,
        body: message.body,
        message_type: message.messageType ?? 'text',
        provider_message_id: message.providerMessageId ?? `e2e-support-${index + 1}`,
        meta: message.meta ?? {},
      }))
    );
    assertNoError(messageError, 'Failed to create support messages');
  }
}

export async function createRewardReviewItem(
  client: SeedClient,
  input: RewardReviewInput
): Promise<void> {
  const { error } = await client.from('reward_review_queue').insert({
    id: input.id ?? randomUUID(),
    user_id: input.userId ?? null,
    reason: input.reason,
    status: input.status ?? 'open',
    metadata: input.metadata ?? {},
  });

  assertNoError(error, 'Failed to create reward review item');
}

export async function createBounty(client: SeedClient, input: BountyInput): Promise<string> {
  const bountyId = input.id ?? randomUUID();
  const now = new Date().toISOString();
  const { error: bountyError } = await client.from('bounties').insert({
    id: bountyId,
    title: input.title,
    description: input.description,
    trigger_type: input.triggerType,
    trigger_metadata: input.triggerMetadata ?? {},
    prize_kes: input.prizeKes,
    status: input.status ?? 'draft',
    winner_id: input.winnerId ?? null,
    claimed_at: input.claimedAt ?? null,
    paid_at: input.paidAt ?? null,
    activated_at: input.activatedAt ?? null,
    week_label: input.weekLabel,
    updated_at: now,
  });
  assertNoError(bountyError, 'Failed to create bounty');

  if ((input.claimAttempts ?? []).length > 0) {
    const { error: claimAttemptError } = await client.from('bounty_claim_attempts').insert(
      (input.claimAttempts ?? []).map((attempt) => ({
        id: attempt.id ?? randomUUID(),
        bounty_id: bountyId,
        user_id: attempt.userId,
        attempted_at: attempt.attemptedAt ?? now,
        won: attempt.won ?? false,
      }))
    );
    assertNoError(claimAttemptError, 'Failed to create bounty claim attempts');
  }

  return bountyId;
}

export async function createSuggestion(client: SeedClient, input: SuggestionInput): Promise<void> {
  const suggestionId = input.id ?? randomUUID();
  const voterIds = input.voterIds ?? [];

  const { error: suggestionError } = await client.from('suggestions').insert({
    id: suggestionId,
    user_id: input.userId,
    game_name: input.gameName,
    description: input.description,
    votes: voterIds.length,
    status: input.status ?? 'pending',
  });
  assertNoError(suggestionError, 'Failed to create suggestion');

  if (voterIds.length > 0) {
    const { error: voteError } = await client.from('suggestion_votes').insert(
      voterIds.map((userId) => ({
        id: randomUUID(),
        suggestion_id: suggestionId,
        user_id: userId,
      }))
    );
    assertNoError(voteError, 'Failed to create suggestion votes');
  }
}

async function seedBaselineFixtures(client: SeedClient, environment: E2EEnvironment) {
  const baselineLastMatchDate = nowMinusDays(1).slice(0, 10);
  const completedMatchId = await createMatch(client, {
    id: SCENARIO_IDS.completedMatch,
    player1Id: SEEDED_PERSONAS.playerFree.id,
    player2Id: SEEDED_PERSONAS.playerOpponentA.id,
    game: 'efootball',
    platform: 'ps',
    region: 'Nairobi',
    status: 'completed',
    winnerId: SEEDED_PERSONAS.playerFree.id,
    player1Score: 2,
    player2Score: 1,
    completedAt: nowMinusDays(1),
  });

  const { error: lastMatchDateError } = await client
    .from('profiles')
    .update({ last_match_date: baselineLastMatchDate })
    .in('id', [SEEDED_PERSONAS.playerFree.id, SEEDED_PERSONAS.playerOpponentA.id]);
  assertNoError(lastMatchDateError, 'Failed to seed profile last_match_date values');

  await createMatchChatMessage(client, {
    matchId: completedMatchId,
    senderUserId: SEEDED_PERSONAS.playerOpponentA.id,
    senderType: 'player',
    body: 'GG, match recorded for the E2E baseline.',
  });

  await createChallenge(client, {
    id: SCENARIO_IDS.pendingChallenge,
    challengerId: SEEDED_PERSONAS.playerOpponentB.id,
    opponentId: SEEDED_PERSONAS.playerFree.id,
    game: 'fc26',
    platform: 'ps',
    message: 'E2E baseline challenge',
  });

  await createLobby(client, {
    id: SCENARIO_IDS.publicLobby,
    hostId: SEEDED_PERSONAS.playerElite.id,
    game: 'fc26',
    title: `E2E Lobby ${environment.runId}`,
    mode: 'Kick Off',
    maxPlayers: 4,
    members: [SEEDED_PERSONAS.playerPro.id],
  });

  await createTournament(client, {
    id: SCENARIO_IDS.openTournament,
    organizerId: SEEDED_PERSONAS.playerElite.id,
    slug: 'e2e-open-cup',
    title: `E2E Open Cup ${environment.runId}`,
    game: 'efootball',
    platform: 'ps',
    region: 'Nairobi',
    size: 4,
    entryFee: 0,
    prizePool: 0,
    joinedUserIds: [
      SEEDED_PERSONAS.playerPro.id,
      SEEDED_PERSONAS.playerOpponentA.id,
    ],
  });

  const liveTournamentId = await createTournament(client, {
    id: SCENARIO_IDS.liveTournament,
    organizerId: SEEDED_PERSONAS.playerElite.id,
    slug: 'e2e-live-cup',
    title: `E2E Live Cup ${environment.runId}`,
    game: 'efootball',
    platform: 'ps',
    region: 'Nairobi',
    size: 4,
    entryFee: 0,
    prizePool: 0,
    status: 'active',
    joinedUserIds: [
      SEEDED_PERSONAS.playerPro.id,
      SEEDED_PERSONAS.playerOpponentA.id,
    ],
  });

  await createLiveStream(client, {
    id: SCENARIO_IDS.liveStream,
    tournamentId: liveTournamentId,
    streamerId: SEEDED_PERSONAS.playerElite.id,
    status: 'active',
    title: `E2E Live Cup Broadcast ${environment.runId}`,
    viewerCount: 18,
    startedAt: nowMinusDays(0),
  });

  const idleTournamentId = await createTournament(client, {
    id: SCENARIO_IDS.idleTournament,
    organizerId: SEEDED_PERSONAS.playerElite.id,
    slug: 'e2e-idle-cup',
    title: `E2E Idle Cup ${environment.runId}`,
    game: 'efootball',
    platform: 'ps',
    region: 'Nairobi',
    size: 4,
    entryFee: 0,
    prizePool: 0,
    status: 'active',
    joinedUserIds: [
      SEEDED_PERSONAS.playerPro.id,
      SEEDED_PERSONAS.playerOpponentB.id,
    ],
  });

  await createLiveStream(client, {
    id: SCENARIO_IDS.idleStream,
    tournamentId: idleTournamentId,
    streamerId: SEEDED_PERSONAS.playerElite.id,
    status: 'idle',
    title: `E2E Idle Cup Broadcast ${environment.runId}`,
    viewerCount: 0,
  });

  await createNotification(client, {
    id: SCENARIO_IDS.notification,
    userId: SEEDED_PERSONAS.playerFree.id,
    type: 'match_completed',
    title: 'Baseline match complete',
    body: 'Your seeded match result is available.',
    href: `/match/${completedMatchId}`,
    metadata: { runId: environment.runId },
  });

  await createBounty(client, {
    id: SCENARIO_IDS.activeBounty,
    title: `E2E Live Bounty ${environment.runId}`,
    description: 'Finish the first match of your day before anyone else to claim the cash.',
    triggerType: 'first_match_of_day',
    prizeKes: 100,
    status: 'active',
    activatedAt: new Date().toISOString(),
    weekLabel: '2026-W17',
  });

  await createBounty(client, {
    id: SCENARIO_IDS.claimedBounty,
    title: `E2E Claimed Bounty ${environment.runId}`,
    description: 'Reach the profile-complete milestone first and lock the payout.',
    triggerType: 'profile_complete',
    prizeKes: 50,
    status: 'claimed',
    winnerId: SEEDED_PERSONAS.playerFree.id,
    claimedAt: nowMinusDays(1),
    activatedAt: nowMinusDays(2),
    weekLabel: '2026-W17',
    claimAttempts: [
      {
        id: SCENARIO_IDS.claimedBountyAttempt,
        userId: SEEDED_PERSONAS.playerFree.id,
        won: true,
        attemptedAt: nowMinusDays(1),
      },
    ],
  });

  await createSupportThread(client, {
    id: SCENARIO_IDS.supportThread,
    channel: 'whatsapp',
    userId: SEEDED_PERSONAS.supportContact.id,
    phone: SEEDED_PERSONAS.supportContact.phone,
    waId: 'e2e-support-whatsapp',
    contactName: 'E2E Support Contact',
    messages: [
      {
        direction: 'inbound',
        senderType: 'user',
        body: 'Need help with a seeded support thread.',
      },
      {
        direction: 'outbound',
        senderType: 'admin',
        body: 'Support thread seeded for the E2E suite.',
      },
    ],
  });

  await createRewardReviewItem(client, {
    id: SCENARIO_IDS.rewardReview,
    userId: SEEDED_PERSONAS.rewardLinkedUser.id,
    reason: 'chezahub_sync_pending',
    metadata: { runId: environment.runId, source: 'e2e-baseline' },
  });

  await createSuggestion(client, {
    id: SCENARIO_IDS.suggestion,
    userId: SEEDED_PERSONAS.playerPro.id,
    gameName: 'Rocket League',
    description: 'Add Rocket League ranked queues to Mechi.',
    voterIds: [SEEDED_PERSONAS.playerFree.id],
  });

  const { error: auditError } = await client.from('admin_audit_logs').insert({
    id: SCENARIO_IDS.adminAuditLog,
    admin_id: SEEDED_PERSONAS.admin.id,
    action: 'e2e_seed',
    target_type: 'system',
    target_id: environment.runId,
    details: { runId: environment.runId },
    ip_address: '127.0.0.1',
  });
  assertNoError(auditError, 'Failed to seed admin audit logs');
}

async function seedAuthStates(environment: E2EEnvironment) {
  await writeStorageStateFile('anon', buildAnonymousStorageState(), environment.projectDir);

  for (const [personaKey, persona] of Object.entries(SEEDED_PERSONAS) as Array<
    [SeededPersonaKey, SeededPersona]
  >) {
    const user = buildAuthUser(persona);
    const token = jwt.sign(
      {
        sub: persona.id,
        username: persona.username,
        role: persona.role,
        is_banned: Boolean(persona.isBanned),
      },
      environment.jwtSecret,
      { expiresIn: '7d' }
    );

    await writeStorageStateFile(
      personaKey,
      buildAuthenticatedStorageState({
        environment,
        token,
        user,
      }),
      environment.projectDir
    );
  }
}

export async function seedBaseline(environment: E2EEnvironment): Promise<void> {
  const client = createE2ESupabaseClient(environment);
  await resetE2EDatabase(client);
  await seedProfiles(client);
  await seedBaselineFixtures(client, environment);
  await seedAuthStates(environment);
}
