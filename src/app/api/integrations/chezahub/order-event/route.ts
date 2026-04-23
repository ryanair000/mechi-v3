import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'ChezaHub reward fulfillment has been retired. Mechi now uses its own wallet and redemption queue.',
    },
    { status: 410 }
  );
}
