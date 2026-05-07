import { NextRequest, NextResponse } from 'next/server';
import {
  hashEmailUnsubscribeToken,
  normalizeEmailPreferenceScope,
  normalizePreferenceEmail,
  verifyEmailUnsubscribeToken,
} from '@/lib/email-preferences';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlResponse(title: string, detail: string, status = 200) {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #101418; color: #f5f7fa; }
      main { max-width: 560px; margin: 0 auto; padding: 64px 24px; }
      h1 { font-size: 28px; line-height: 1.2; margin: 0 0 12px; }
      p { color: #c8d0da; font-size: 16px; line-height: 1.6; margin: 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(detail)}</p>
    </main>
  </body>
</html>`,
    {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }
  );
}

async function recordUnsubscribe(request: NextRequest) {
  const email = normalizePreferenceEmail(request.nextUrl.searchParams.get('email'));
  const scope = normalizeEmailPreferenceScope(request.nextUrl.searchParams.get('scope'));
  const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';

  if (!email || !token || !verifyEmailUnsubscribeToken({ email, scope, token })) {
    return { ok: false as const, status: 400, error: 'This unsubscribe link is invalid.' };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('email_unsubscribes').upsert(
    {
      email,
      normalized_email: email,
      scope,
      token_hash: hashEmailUnsubscribeToken(token),
      unsubscribed_at: new Date().toISOString(),
      metadata: {
        source: 'email_unsubscribe_link',
        user_agent: request.headers.get('user-agent'),
      },
    },
    { onConflict: 'normalized_email,scope' }
  );

  if (error) {
    console.error('[Email Preferences] Unsubscribe error:', error);
    return { ok: false as const, status: 500, error: 'We could not update your email preference.' };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const result = await recordUnsubscribe(request);
  if (!result.ok) {
    return htmlResponse('Unsubscribe link problem', result.error, result.status);
  }

  return htmlResponse(
    'You are unsubscribed.',
    'Mechi will stop sending game update emails to this address.'
  );
}

export async function POST(request: NextRequest) {
  const result = await recordUnsubscribe(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(null, { status: 200 });
}
