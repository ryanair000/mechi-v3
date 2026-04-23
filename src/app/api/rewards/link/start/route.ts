import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  return NextResponse.json(
    {
      error:
        'ChezaHub wallet linking has been retired. Eligible partner rewards create or attach your wallet automatically when you redeem.',
    },
    { status: 410 }
  );
}
