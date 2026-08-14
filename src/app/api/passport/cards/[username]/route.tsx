import { NextRequest } from 'next/server';
import { getPassportData, normalizePassportUsername } from '@/lib/passport';
import { getPassportCardPresentation } from '@/lib/passport-card-data';
import { createPassportCardResponse } from '@/lib/passport-card-response';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  return createPassportCardResponse(
    request,
    normalizePassportUsername(rawUsername),
    {
      loadPassport: getPassportData,
      loadPresentation: getPassportCardPresentation,
    }
  );
}
