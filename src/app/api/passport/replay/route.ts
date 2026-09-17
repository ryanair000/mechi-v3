import { NextRequest, NextResponse } from "next/server";
import { requireActiveAccessProfile } from "@/lib/access";
import {
  generatePassportReplay,
  getPassportReplays,
  setPassportReplayPublic,
} from "@/lib/passport-progression";

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  return NextResponse.json({
    replays: await getPassportReplays(access.profile.id),
  });
}
export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const result = await generatePassportReplay(
    access.profile.id,
    Number(body.year),
  );
  return NextResponse.json(
    result.replay ? { replay: result.replay } : { error: result.error },
    { status: result.replay ? 201 : 400 },
  );
}
export async function PATCH(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const updated = await setPassportReplayPublic(
    access.profile.id,
    String(body.id ?? ""),
    body.is_public === true,
  );
  return NextResponse.json(
    updated ? { success: true } : { error: "Replay not found" },
    { status: updated ? 200 : 404 },
  );
}
