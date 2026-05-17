import { NextRequest, NextResponse } from 'next/server';
import { checkPersistentRateLimit, getClientIp, rateLimitHeaders, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import {
  TZ_TOURNAMENT,
  cleanTanzaniaTournamentText,
  normalizeTanzaniaPhone,
} from '@/lib/tanzania-tournament';
import { sendOnlineTournamentRegistrationTelegramNotification } from '@/lib/telegram';

function cleanOptional(value: unknown, maxLength = 120) {
  const cleaned = cleanTanzaniaTournamentText(value, maxLength);
  return cleaned || null;
}

async function loadRegistrationCounts(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await supabase
    .from('tanzania_tournament_registrations')
    .select('payment_status')
    .eq('event_slug', TZ_TOURNAMENT.slug);
  const rows = (data ?? []) as Array<{ payment_status?: string | null }>;

  return {
    registered: rows.length,
    confirmed: rows.filter((row) => row.payment_status === 'paid').length,
    pendingPayment: rows.filter((row) =>
      row.payment_status === 'pending_payment' || row.payment_status === 'manual_review'
    ).length,
  };
}

export async function POST(request: NextRequest) {
  const rate = await checkPersistentRateLimit(
    `tz-register:${getClientIp(request)}`,
    8,
    10 * 60 * 1000
  );

  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSeconds);
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = cleanTanzaniaTournamentText(body.full_name, 120);
    const phone = normalizeTanzaniaPhone(body.phone);
    const whatsappNumber = normalizeTanzaniaPhone(body.whatsapp_number) || phone;
    const email = cleanOptional(body.email, 160);
    const inGameUsername = cleanTanzaniaTournamentText(body.in_game_username, 80);
    const konamiId = cleanOptional(body.konami_id, 80);
    const city = cleanOptional(body.city, 80);

    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        { error: 'Weka jina kamili.' },
        { status: 400, headers: rateLimitHeaders(rate) }
      );
    }

    if (!phone || phone.length < 9) {
      return NextResponse.json(
        { error: 'Weka namba sahihi ya simu.' },
        { status: 400, headers: rateLimitHeaders(rate) }
      );
    }

    if (!inGameUsername || inGameUsername.length < 2) {
      return NextResponse.json(
        { error: 'Weka jina lako la eFootball Mobile.' },
        { status: 400, headers: rateLimitHeaders(rate) }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('tanzania_tournament_registrations')
      .insert({
        event_slug: TZ_TOURNAMENT.slug,
        full_name: fullName,
        phone,
        whatsapp_number: whatsappNumber,
        email,
        in_game_username: inGameUsername,
        konami_id: konamiId,
        city,
        payment_status: 'pending_payment',
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Namba au jina la mchezo tayari limesajiliwa kwa tournament hii.' },
          { status: 409, headers: rateLimitHeaders(rate) }
        );
      }

      console.error('[TZ Register] Could not save registration:', error);
      return NextResponse.json(
        { error: 'Usajili haujahifadhiwa. Jaribu tena.' },
        { status: 500, headers: rateLimitHeaders(rate) }
      );
    }

    try {
      const counts = await loadRegistrationCounts(supabase);
      await sendOnlineTournamentRegistrationTelegramNotification({
        eventTitle: TZ_TOURNAMENT.title,
        username: fullName,
        gameLabel: TZ_TOURNAMENT.game,
        inGameUsername,
        email,
        phone,
        whatsappNumber,
        followedInstagram: false,
        subscribedYoutube: false,
        eligibilityStatus: 'pending',
        registered: counts.registered,
        confirmed: counts.confirmed,
        pendingPayment: counts.pendingPayment,
        slots: 0,
        spotsLeft: 0,
        paymentStatus: 'pending_payment',
        paymentEvent: 'pending',
        paymentLabel: `${TZ_TOURNAMENT.paymentMethod} ${TZ_TOURNAMENT.entryFeeLabel}`,
        entryFeeKes: null,
        registrationId: (data as { id: string }).id,
        adminPath: '/moderators/tz',
      });
    } catch (telegramError) {
      console.error('[TZ Register] Telegram notification error:', telegramError);
    }

    return NextResponse.json(
      {
        id: (data as { id: string }).id,
        message:
          `Usajili umetumwa. Lipa ${TZ_TOURNAMENT.entryFeeLabel} kupitia ${TZ_TOURNAMENT.paymentMethod} kwenda ${TZ_TOURNAMENT.paymentNumber}, kisha tuma screenshot WhatsApp ${TZ_TOURNAMENT.supportNumber}.`,
      },
      { headers: rateLimitHeaders(rate) }
    );
  } catch (error) {
    console.error('[TZ Register] Error:', error);
    return NextResponse.json(
      { error: 'Usajili haujakamilika. Jaribu tena.' },
      { status: 500, headers: rateLimitHeaders(rate) }
    );
  }
}
