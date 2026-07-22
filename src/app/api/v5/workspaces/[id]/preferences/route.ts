import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getV5WorkspaceAccess } from '@/lib/v5-workspace-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireActiveAccessProfile(request);
  if (session.response) return session.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const access = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: id,
    permission: 'workspace:read',
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { data, error } = await supabase
    .from('workspace_preferences')
    .select('last_route,theme,density,notification_preferences,updated_at')
    .eq('workspace_id', id)
    .eq('user_id', session.profile.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'Workspace preferences could not be loaded.' }, { status: 500 });
  }
  return NextResponse.json({
    preferences: data ?? {
      last_route: null,
      theme: null,
      density: null,
      notification_preferences: {},
      updated_at: null,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireActiveAccessProfile(request);
  if (session.response) return session.response;
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Send valid workspace preferences.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const access = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: id,
    permission: 'workspace:read',
    mutation: true,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const theme = body.theme === null ? null : String(body.theme ?? '').trim();
  const density = body.density === null ? null : String(body.density ?? '').trim();
  const lastRoute = body.last_route === null ? null : String(body.last_route ?? '').trim().slice(0, 300);
  const expectedPrefix = `/app/${access.access.workspace.type}`;
  if (theme && !['light', 'dark'].includes(theme)) {
    return NextResponse.json({ error: 'Choose light or dark theme.' }, { status: 400 });
  }
  if (density && !['compact', 'comfortable'].includes(density)) {
    return NextResponse.json({ error: 'Choose compact or comfortable density.' }, { status: 400 });
  }
  if (lastRoute && !lastRoute.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: 'Last route must belong to this workspace.' }, { status: 400 });
  }
  const notificationPreferences =
    body.notification_preferences &&
    typeof body.notification_preferences === 'object' &&
    !Array.isArray(body.notification_preferences)
      ? body.notification_preferences
      : {};

  const { data, error } = await supabase
    .from('workspace_preferences')
    .upsert(
      {
        workspace_id: id,
        user_id: session.profile.id,
        last_route: lastRoute,
        theme: theme || null,
        density: density || null,
        notification_preferences: notificationPreferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,user_id' }
    )
    .select('last_route,theme,density,notification_preferences,updated_at')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: 'Workspace preferences could not be saved.' }, { status: 500 });
  }
  return NextResponse.json({ preferences: data });
}
