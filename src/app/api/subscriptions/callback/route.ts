import { NextRequest, NextResponse } from 'next/server';
import { verifyAndActivateSubscriptionByReference } from '@/lib/subscription';

function pricingRedirect(request: NextRequest, status: 'success' | 'failed') {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    request.nextUrl.origin;
  const redirectUrl = new URL('/pricing', appUrl);
  redirectUrl.searchParams.set('checkout', status);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  try {
    const reference =
      request.nextUrl.searchParams.get('reference') ??
      request.nextUrl.searchParams.get('trxref') ??
      '';

    if (!reference) {
      return pricingRedirect(request, 'failed');
    }

    const result = await verifyAndActivateSubscriptionByReference(reference);
    return pricingRedirect(request, result.success ? 'success' : 'failed');
  } catch (error) {
    console.error('[Subscription Callback] Error:', error);
    return pricingRedirect(request, 'failed');
  }
}
