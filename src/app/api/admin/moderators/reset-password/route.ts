import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess, requireActiveAccessProfile } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { hashPassword } from '@/lib/auth';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

type ModeratorCredential = {
  id: string;
  username: string;
  phone: string | null;
  email: string | null;
  password: string;
};

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(14);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function readBoolean(value: unknown) {
  return value === true || value === 'true';
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  if (!hasAdminAccess(access.profile)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  const resetAllModerators = readBoolean(body.reset_all_moderators);
  const includeAdmins = readBoolean(body.include_admins);

  if (!userId && !resetAllModerators) {
    return NextResponse.json({ error: 'Choose a moderator to reset' }, { status: 400 });
  }

  const supabase = createServiceClient();

  let query = supabase
    .from('profiles')
    .select('id, username, phone, email, role, is_banned')
    .order('username', { ascending: true });

  if (userId) {
    query = query.eq('id', userId);
  } else if (includeAdmins) {
    query = query.in('role', ['moderator', 'admin']);
  } else {
    query = query.eq('role', 'moderator');
  }

  const { data: profiles, error: readError } = await query;
  if (readError) {
    return NextResponse.json({ error: 'Could not load moderator accounts' }, { status: 500 });
  }

  const targets = (profiles ?? []).filter((profile) => {
    if (profile.is_banned) return false;
    return profile.role === 'moderator' || (includeAdmins && profile.role === 'admin');
  });

  if (!targets.length) {
    return NextResponse.json({ error: 'No active moderator accounts found' }, { status: 404 });
  }

  const credentials: ModeratorCredential[] = [];
  for (const profile of targets) {
    const password = generatePassword();
    const passwordHash = await hashPassword(password);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        password_hash: passwordHash,
      })
      .eq('id', profile.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Could not reset password for ${profile.username}` },
        { status: 500 }
      );
    }

    credentials.push({
      id: profile.id,
      username: profile.username,
      phone: profile.phone,
      email: profile.email,
      password,
    });
  }

  await writeAuditLog({
    adminId: access.profile.id,
    action: 'system_note',
    targetType: 'user',
    targetId: userId || undefined,
    ipAddress: getClientIp(request),
    details: {
      action: resetAllModerators ? 'reset_all_moderator_passwords' : 'reset_moderator_password',
      count: credentials.length,
      target_ids: credentials.map((credential) => credential.id),
    },
  });

  return NextResponse.json({ credentials });
}
