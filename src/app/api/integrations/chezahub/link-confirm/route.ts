import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'ChezaHub account linking has been retired. Redeem rewards directly inside Mechi.',
    },
    { status: 410 }
  );
}
