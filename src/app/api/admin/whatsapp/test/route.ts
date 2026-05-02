import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess, getRequestAccessProfile } from '@/lib/access';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { ONLINE_TOURNAMENT_GAME_BY_KEY, isOnlineTournamentGame } from '@/lib/online-tournament';
import { createServiceClient } from '@/lib/supabase';
import {
  buildMatchDisputeMessage,
  buildMatchFoundMessage,
  buildResultConfirmedMessage,
  sendOnlineTournamentRegistrationWhatsApp,
  sendOnlineTournamentReminderWhatsApp,
  sendWhatsApp,
  sendWhatsAppTemplate,
} from '@/lib/whatsapp';

type TestMode =
  | 'hello_world'
  | 'match_found'
  | 'result_confirmed'
  | 'dispute'
  | 'playmechi_registration'
  | 'playmechi_reminder';

function isValidMode(value: unknown): value is TestMode {
  return (
    value === 'hello_world' ||
    value === 'match_found' ||
    value === 'result_confirmed' ||
    value === 'dispute' ||
    value === 'playmechi_registration' ||
    value === 'playmechi_reminder'
  );
}

export async function POST(request: NextRequest) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasAdminAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sendRateLimit = await checkPersistentRateLimit(
      `admin-whatsapp-test:${admin.id}:${getClientIp(request)}`,
      10,
      15 * 60 * 1000
    );
    if (!sendRateLimit.allowed) {
      return rateLimitResponse(sendRateLimit.retryAfterSeconds);
    }

    const body = await request.json();
    const mode = body.mode;

    if (!isValidMode(mode)) {
      return NextResponse.json({ error: 'Invalid test mode' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const username =
      typeof body.username === 'string' && body.username.trim().length > 0
        ? body.username.trim()
        : null;
    const manualPhone =
      typeof body.phone === 'string' && body.phone.trim().length > 0
        ? body.phone.trim()
        : null;

    let targetProfile:
      | {
          id: string;
          username: string;
          phone: string | null;
          whatsapp_number: string | null;
          whatsapp_notifications: boolean | null;
        }
      | null = null;

    if (username) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, phone, whatsapp_number, whatsapp_notifications')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: 'Could not load target profile' }, { status: 500 });
      }

      if (data) {
        targetProfile = {
          id: data.id as string,
          username: data.username as string,
          phone: (data.phone as string | null | undefined) ?? null,
          whatsapp_number: (data.whatsapp_number as string | null | undefined) ?? null,
          whatsapp_notifications: (data.whatsapp_notifications as boolean | null | undefined) ?? null,
        };
      }
    }

    const resolvedPhone = manualPhone ?? targetProfile?.whatsapp_number ?? targetProfile?.phone ?? null;
    const resolvedUsername = targetProfile?.username ?? username ?? 'Player';

    if (!resolvedPhone) {
      return NextResponse.json({ error: 'No phone number available for this recipient' }, { status: 400 });
    }

    let result;

    if (mode === 'hello_world') {
      result = await sendWhatsAppTemplate({ to: resolvedPhone });
    } else if (mode === 'playmechi_registration') {
      const tournamentGameRaw = typeof body.game === 'string' ? body.game.trim() : 'codm';
      const tournamentGame = isOnlineTournamentGame(tournamentGameRaw) ? tournamentGameRaw : 'codm';
      const config = ONLINE_TOURNAMENT_GAME_BY_KEY[tournamentGame];
      result = await sendOnlineTournamentRegistrationWhatsApp({
        to: resolvedPhone,
        username: resolvedUsername,
        gameLabel: config.label,
        dateLabel: config.dateLabel,
        timeLabel: config.timeLabel,
        inGameUsername:
          typeof body.inGameUsername === 'string' && body.inGameUsername.trim().length > 0
            ? body.inGameUsername.trim()
            : `${resolvedUsername}-tag`,
        whatsappGroupUrl: config.whatsappGroupUrl,
      });
    } else if (mode === 'playmechi_reminder') {
      const tournamentGameRaw = typeof body.game === 'string' ? body.game.trim() : 'codm';
      const tournamentGame = isOnlineTournamentGame(tournamentGameRaw) ? tournamentGameRaw : 'codm';
      const config = ONLINE_TOURNAMENT_GAME_BY_KEY[tournamentGame];
      result = await sendOnlineTournamentReminderWhatsApp({
        to: resolvedPhone,
        username: resolvedUsername,
        gameLabel: config.label,
        dateLabel: config.dateLabel,
        timeLabel: config.timeLabel,
        inGameUsername:
          typeof body.inGameUsername === 'string' && body.inGameUsername.trim().length > 0
            ? body.inGameUsername.trim()
            : `${resolvedUsername}-tag`,
        format: config.format,
        scoring: config.scoring,
      });
    } else if (mode === 'match_found') {
      result = await sendWhatsApp(
        resolvedPhone,
        buildMatchFoundMessage({
          username: resolvedUsername,
          game: typeof body.game === 'string' && body.game.trim().length > 0 ? body.game.trim() : 'eFootball 2026',
          opponentUsername:
            typeof body.opponentUsername === 'string' && body.opponentUsername.trim().length > 0
              ? body.opponentUsername.trim()
              : 'samawesome',
          matchId:
            typeof body.matchId === 'string' && body.matchId.trim().length > 0
              ? body.matchId.trim()
              : 'preview-match',
        })
      );
    } else if (mode === 'result_confirmed') {
      result = await sendWhatsApp(
        resolvedPhone,
        buildResultConfirmedMessage({
          username: resolvedUsername,
          opponentUsername:
            typeof body.opponentUsername === 'string' && body.opponentUsername.trim().length > 0
              ? body.opponentUsername.trim()
              : 'samawesome',
          game: typeof body.game === 'string' && body.game.trim().length > 0 ? body.game.trim() : 'eFootball 2026',
          won: body.won !== false,
          rankLabel:
            typeof body.rankLabel === 'string' && body.rankLabel.trim().length > 0
              ? body.rankLabel.trim()
              : 'Silver II',
          level: typeof body.level === 'number' ? body.level : 3,
        })
      );
    } else {
      result = await sendWhatsApp(
        resolvedPhone,
        buildMatchDisputeMessage({
          username: resolvedUsername,
          opponentUsername:
            typeof body.opponentUsername === 'string' && body.opponentUsername.trim().length > 0
              ? body.opponentUsername.trim()
              : 'samawesome',
          game: typeof body.game === 'string' && body.game.trim().length > 0 ? body.game.trim() : 'eFootball 2026',
          matchId:
            typeof body.matchId === 'string' && body.matchId.trim().length > 0
              ? body.matchId.trim()
              : 'preview-match',
        })
      );
    }

    return NextResponse.json({
      success: result.ok,
      recipient: {
        username: resolvedUsername,
        phone: resolvedPhone,
        profileFound: Boolean(targetProfile),
        notificationsEnabled: Boolean(targetProfile?.whatsapp_notifications),
      },
      result,
    });
  } catch (err) {
    console.error('[Admin WhatsApp Test] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
