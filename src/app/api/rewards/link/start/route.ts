import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  return NextResponse.json(
    {
      error: 'Direct wallet linking has been retired. Redeemables are handled automatically inside Mechi.',
    },
    { status: 410 }
  );
}
