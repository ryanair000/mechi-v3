import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { runSeed } from "@/lib/seed";

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  const result = await runSeed();
  return NextResponse.json(result);
}
