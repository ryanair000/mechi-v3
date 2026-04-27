import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  void request;

  return NextResponse.json(
    {
      error:
        'Password reset links are disabled. Enter your username and email on the reset form, then choose a new password directly.',
    },
    { status: 410 }
  );
}
