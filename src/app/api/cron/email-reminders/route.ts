import { NextRequest, NextResponse } from 'next/server';
import { claimEmailDeliveryEvent } from '@/lib/email-delivery-events';
import { sendOnlineTournamentGameReminderEmail } from '@/lib/email';
import {
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
  ONLINE_TOURNAMENT_SLUG,
  ONLINE_TOURNAMENT_TITLE,
  ONLINE_TOURNAMENT_YOUTUBE_URL,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import { createServiceClient } from '@/lib/supabase';
import { APP_URL } from '@/lib/urls';

export const runtime = 'nodejs';

const DEFAULT_REMINDER_LEAD_MINUTES = 60;
const DEFAULT_REMINDER_WINDOW_MINUTES = 25;

type ReminderRegistrationRow = {
  id: string;
  user_id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  email?: string | null;
  eligibility_status?: string | null;
  check_in_status?: string | null;
  user?: { id: string; username: string; email?: string | null } | Array<{
    id: string;
    username: string;
    email?: string | null;
  }> | null;
};

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  return (
    request.headers.get('authorization') === `Bearer ${secret}` ||
    request.headers.get('x-cron-secret') === secret
  );
}

function isInsideReminderWindow(startsAtIso: string, now: Date) {
  const leadMinutes = toPositiveInt(
    process.env.EMAIL_REMINDER_LEAD_MINUTES,
    DEFAULT_REMINDER_LEAD_MINUTES
  );
  const windowMinutes = toPositiveInt(
    process.env.EMAIL_REMINDER_WINDOW_MINUTES,
    DEFAULT_REMINDER_WINDOW_MINUTES
  );
  const minutesUntilStart = (new Date(startsAtIso).getTime() - now.getTime()) / 60_000;

  return (
    minutesUntilStart >= leadMinutes - windowMinutes &&
    minutesUntilStart <= leadMinutes + windowMinutes
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const supabase = createServiceClient();
    let checked = 0;
    let claimed = 0;
    let skipped = 0;
    const sendTasks: Promise<void>[] = [];

    for (const game of ONLINE_TOURNAMENT_GAMES) {
      if (!isInsideReminderWindow(game.matchStartsAt, now)) {
        continue;
      }

      const { data, error } = await supabase
        .from('online_tournament_registrations')
        .select(
          'id, user_id, game, in_game_username, email, eligibility_status, check_in_status, user:user_id(id, username, email)'
        )
        .eq('event_slug', ONLINE_TOURNAMENT_SLUG)
        .eq('game', game.game)
        .neq('eligibility_status', 'disqualified')
        .neq('check_in_status', 'no_show');

      if (error) {
        console.error('[Email Reminders] Registration query error:', error);
        continue;
      }

      for (const registration of ((data ?? []) as ReminderRegistrationRow[])) {
        checked += 1;
        const profile = firstRelation(registration.user);
        const recipient = registration.email?.trim() || profile?.email?.trim() || '';

        if (!recipient) {
          skipped += 1;
          continue;
        }

        const eventKey = [
          'online-tournament-reminder',
          ONLINE_TOURNAMENT_SLUG,
          registration.game,
          registration.user_id,
          game.matchStartsAt,
        ].join(':');
        const didClaim = await claimEmailDeliveryEvent(supabase, {
          eventKey,
          eventType: 'online_tournament_game_reminder',
          recipient,
          userId: registration.user_id,
          metadata: {
            event_slug: ONLINE_TOURNAMENT_SLUG,
            game: registration.game,
            starts_at: game.matchStartsAt,
            registration_id: registration.id,
          },
        });

        if (!didClaim) {
          skipped += 1;
          continue;
        }

        claimed += 1;
        const config = ONLINE_TOURNAMENT_GAME_BY_KEY[registration.game];
        sendTasks.push(
          sendOnlineTournamentGameReminderEmail({
            to: recipient,
            username: profile?.username || 'player',
            eventTitle: ONLINE_TOURNAMENT_TITLE,
            gameLabel: config.label,
            matchStartsAt: config.matchStartsAt,
            inGameUsername: registration.in_game_username,
            format: config.format,
            matchCount: config.matchCount,
            scoring: config.scoring,
            registrationUrl: `${APP_URL}${ONLINE_TOURNAMENT_REGISTRATION_PATH}`,
            streamUrl: ONLINE_TOURNAMENT_YOUTUBE_URL,
          })
        );
      }
    }

    await Promise.allSettled(sendTasks);

    return NextResponse.json({
      ok: true,
      checked,
      claimed,
      skipped,
      sent: sendTasks.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[Email Reminders] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
