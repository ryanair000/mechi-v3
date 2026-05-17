import { NextRequest, NextResponse } from 'next/server';
import { requireTanzaniaTournamentModeratorAccess } from '@/lib/tanzania-tournament-access';
import { createServiceClient } from '@/lib/supabase';
import {
  TZ_TOURNAMENT,
  TZ_TOURNAMENT_PAYMENT_STATUSES,
  cleanTanzaniaTournamentText,
  type TanzaniaTournamentPaymentStatus,
} from '@/lib/tanzania-tournament';
import { sendOnlineTournamentRegistrationTelegramNotification } from '@/lib/telegram';

function cleanOptional(value: unknown, maxLength = 500) {
  const cleaned = cleanTanzaniaTournamentText(value, maxLength);
  return cleaned || null;
}

function isPaymentStatus(value: unknown): value is TanzaniaTournamentPaymentStatus {
  return TZ_TOURNAMENT_PAYMENT_STATUSES.includes(value as TanzaniaTournamentPaymentStatus);
}

async function loadRegistrations() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tanzania_tournament_registrations')
    .select('*')
    .eq('event_slug', TZ_TOURNAMENT.slug)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

function getRegistrationCounts(registrations: Array<{ payment_status?: string | null }>) {
  return {
    registered: registrations.length,
    confirmed: registrations.filter((registration) => registration.payment_status === 'paid').length,
    pendingPayment: registrations.filter(
      (registration) =>
        registration.payment_status === 'pending_payment' ||
        registration.payment_status === 'manual_review'
    ).length,
  };
}

export async function GET(request: NextRequest) {
  const access = await requireTanzaniaTournamentModeratorAccess(request);
  if (access.response) {
    return access.response;
  }

  try {
    return NextResponse.json({ registrations: await loadRegistrations() });
  } catch (error) {
    console.error('[TZ Moderator Registrations] GET error:', error);
    return NextResponse.json({ error: 'Could not load Tanzania registrations' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireTanzaniaTournamentModeratorAccess(request);
  if (access.response) {
    return access.response;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const registrationId = cleanTanzaniaTournamentText(body.registration_id, 80);

    if (!registrationId) {
      return NextResponse.json({ error: 'Registration id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (Object.prototype.hasOwnProperty.call(body, 'payment_status')) {
      if (!isPaymentStatus(body.payment_status)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
      }

      updates.payment_status = body.payment_status;
      if (body.payment_status === 'paid') {
        updates.confirmed_at = updates.updated_at;
        updates.confirmed_by = access.profile.id;
      } else if (body.payment_status === 'pending_payment' || body.payment_status === 'rejected') {
        updates.confirmed_at = null;
        updates.confirmed_by = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'payment_reference')) {
      updates.payment_reference = cleanOptional(body.payment_reference, 120);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'payment_note')) {
      updates.payment_note = cleanOptional(body.payment_note, 500);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'admin_note')) {
      updates.admin_note = cleanOptional(body.admin_note, 500);
    }

    const supabase = createServiceClient();
    const { data: updatedRaw, error } = await supabase
      .from('tanzania_tournament_registrations')
      .update(updates)
      .eq('id', registrationId)
      .eq('event_slug', TZ_TOURNAMENT.slug)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[TZ Moderator Registrations] PATCH error:', error);
      return NextResponse.json({ error: 'Could not update registration' }, { status: 500 });
    }

    const updated = updatedRaw as
      | {
          id: string;
          full_name: string;
          phone: string;
          whatsapp_number: string | null;
          email: string | null;
          in_game_username: string;
          payment_status: TanzaniaTournamentPaymentStatus;
          payment_reference: string | null;
        }
      | null;

    const registrations = await loadRegistrations();

    if (updated && Object.prototype.hasOwnProperty.call(body, 'payment_status')) {
      try {
        const counts = getRegistrationCounts(registrations);
        await sendOnlineTournamentRegistrationTelegramNotification({
          eventTitle: TZ_TOURNAMENT.title,
          username: updated.full_name,
          gameLabel: TZ_TOURNAMENT.game,
          inGameUsername: updated.in_game_username,
          email: updated.email,
          phone: updated.phone,
          whatsappNumber: updated.whatsapp_number ?? updated.phone,
          followedInstagram: false,
          subscribedYoutube: false,
          eligibilityStatus: updated.payment_status === 'paid' ? 'verified' : updated.payment_status,
          registered: counts.registered,
          confirmed: counts.confirmed,
          pendingPayment: counts.pendingPayment,
          slots: 0,
          spotsLeft: 0,
          paymentStatus: updated.payment_status,
          paymentEvent: updated.payment_status === 'paid' ? 'confirmed' : 'updated',
          paymentReference: updated.payment_reference,
          paymentLabel: `${TZ_TOURNAMENT.paymentMethod} ${TZ_TOURNAMENT.entryFeeLabel}`,
          entryFeeKes: null,
          registrationId: updated.id,
          adminPath: '/moderators/tz',
        });
      } catch (telegramError) {
        console.error('[TZ Moderator Registrations] Telegram notification error:', telegramError);
      }
    }

    return NextResponse.json({ registrations });
  } catch (error) {
    console.error('[TZ Moderator Registrations] PATCH error:', error);
    return NextResponse.json({ error: 'Could not update registration' }, { status: 500 });
  }
}
