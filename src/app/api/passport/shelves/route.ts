import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportShelves, savePassportShelf } from '@/lib/passport-progression';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const supabase = createServiceClient();
  const [shelves, games] = await Promise.all([getPassportShelves(access.profile.id, access.profile.id), supabase.from('passport_game_entries').select('id, game:passport_game_catalog(title)').eq('user_id', access.profile.id).order('created_at', { ascending: false })]);
  return NextResponse.json({ shelves, games: games.data ?? [] });
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const result = await savePassportShelf(access.profile.id, { id: typeof body.id === 'string' ? body.id : null, title: String(body.title ?? ''), description: String(body.description ?? ''), visibility: String(body.visibility ?? 'public'), displayOrder: Number(body.display_order ?? 0), gameEntryIds: Array.isArray(body.game_entry_ids) ? body.game_entry_ids.map(String) : [] });
  return NextResponse.json(result.error ? { error: result.error } : { success: true, shelf_id: result.shelfId }, { status: result.error ? 400 : 201 });
}
