import { NextRequest } from 'next/server';
import { getPassportData } from '@/lib/passport';
import { getPassportCardPresentation } from '@/lib/passport-card-data';
import { createPassportCardResponse } from '@/lib/passport-card-response';
import { validatePassportHandle } from '@/lib/passport-handle';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const handle = validatePassportHandle(request.nextUrl.searchParams.get('username') ?? '');
  const response = await createPassportCardResponse(
    request,
    handle.valid ? handle.handle : '',
    {
      loadPassport: getPassportData,
      loadPresentation: getPassportCardPresentation,
    }
  );

  response.headers.set('Deprecation', 'true');
  if (handle.valid) {
    response.headers.set(
      'Link',
      `</api/passport/cards/${encodeURIComponent(handle.handle)}?format=horizontal>; rel="successor-version"`
    );
  }
  return response;
}
