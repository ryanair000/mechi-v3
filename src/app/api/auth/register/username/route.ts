import { NextRequest, NextResponse } from 'next/server';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { isUsernameTaken } from '@/lib/username-availability';
import { validateUsername } from '@/lib/username';

export async function GET(request: NextRequest) {
  const rateLimit = await checkPersistentRateLimit(
    `register-username:${getClientIp(request)}`,
    30,
    15 * 60 * 1000
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const submittedUsername = request.nextUrl.searchParams.get('username');
  const { username, error } = validateUsername(submittedUsername);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const taken = await isUsernameTaken(username);

    return NextResponse.json({
      username,
      available: !taken,
    });
  } catch (availabilityError) {
    console.error('[Register] Username availability error:', availabilityError);
    return NextResponse.json(
      { error: 'Could not check username right now' },
      { status: 500 }
    );
  }
}
