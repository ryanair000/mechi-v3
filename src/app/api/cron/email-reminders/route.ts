import { NextRequest, NextResponse } from 'next/server';
import { claimDeliveryEvent } from '@/lib/email-delivery-events';
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
import {
  formatWhatsAppDeliveryError,
  isOnlineTournamentReminderWhatsAppConfigured,
  sendOnlineTournamentReminderWhatsApp,
} from '@/lib/whatsapp';

export const runtime = 'nodejs';

const DEFAULT_REMINDER_LEAD_MINUTES = 60;
const DEFAULT_REMINDER_WINDOW_MINUTES = 25;

type ReminderRegistrationRow = {
  id: string;
  user_id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  email?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
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
    let emailClaimed = 0;
    let whatsappClaimed = 0;
    let skipped = 0;
    const sendTasks: Promise<void>[] = [];

    for (const game of ONLINE_TOURNAMENT_GAMES) {
      if (!isInsideReminderWindow(game.matchStartsAt, now)) {
        continue;
      }

      const { data, error } = await supabase
        .from('online_tournament_registrations')
        .select(
          'id, user_id, game, in_game_username, email, phone, whatsapp_number, eligibility_status, check_in_status, user:user_id(id, username, email)'
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
        const username = profile?.username || 'player';
        const config = ONLINE_TOURNAMENT_GAME_BY_KEY[registration.game];
        const emailRecipient = registration.email?.trim() || profile?.email?.trim() || '';

        if (!emailRecipient) {
          skipped += 1;
        } else {
          const emailEventKey = [
            'online-tournament-email-reminder',
            ONLINE_TOURNAMENT_SLUG,
            registration.game,
            registration.user_id,
            game.matchStartsAt,
          ].join(':');
          const didClaimEmail = await claimDeliveryEvent(supabase, {
            eventKey: emailEventKey,
            eventType: 'online_tournament_game_email_reminder',
            recipient: emailRecipient,
            userId: registration.user_id,
            metadata: {
              event_slug: ONLINE_TOURNAMENT_SLUG,
              game: registration.game,
              starts_at: game.matchStartsAt,
              registration_id: registration.id,
            },
          });

          if (didClaimEmail) {
            emailClaimed += 1;
            sendTasks.push(
              sendOnlineTournamentGameReminderEmail({
                to: emailRecipient,
                username,
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
          } else {
            skipped += 1;
          }
        }

        const whatsappRecipient = registration.whatsapp_number?.trim() || registration.phone?.trim() || '';
        if (!whatsappRecipient) {
          skipped += 1;
          continue;
        }

        if (!isOnlineTournamentReminderWhatsAppConfigured()) {
          skipped += 1;
          continue;
        }

        const whatsappEventKey = [
          'online-tournament-whatsapp-reminder',
          ONLINE_TOURNAMENT_SLUG,
          registration.game,
          registration.user_id,
          game.matchStartsAt,
        ].join(':');
        const didClaimWhatsApp = await claimDeliveryEvent(supabase, {
          eventKey: whatsappEventKey,
          eventType: 'online_tournament_game_whatsapp_reminder',
          recipient: whatsappRecipient,
          userId: registration.user_id,
          metadata: {
            event_slug: ONLINE_TOURNAMENT_SLUG,
            game: registration.game,
            starts_at: game.matchStartsAt,
            registration_id: registration.id,
          },
        });

        if (!didClaimWhatsApp) {
          skipped += 1;
          continue;
        }

        whatsappClaimed += 1;
        sendTasks.push(
          sendOnlineTournamentReminderWhatsApp({
            to: whatsappRecipient,
            username,
            gameLabel: config.label,
            dateLabel: config.dateLabel,
            timeLabel: config.timeLabel,
            inGameUsername: registration.in_game_username,
            format: config.format,
            scoring: config.scoring,
            appUrl: APP_URL,
            streamUrl: ONLINE_TOURNAMENT_YOUTUBE_URL,
          }).then((result) => {
            if (!result.ok && !result.skipped) {
              console.error(
                '[WhatsApp Reminders] Delivery failed:',
                formatWhatsAppDeliveryError(result)
              );
            }
          })
        );
      }
    }

    await Promise.allSettled(sendTasks);

    return NextResponse.json({
      ok: true,
      checked,
      claimed: emailClaimed + whatsappClaimed,
      emailClaimed,
      whatsappClaimed,
      skipped,
      sent: sendTasks.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[Email Reminders] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
