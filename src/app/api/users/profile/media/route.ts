import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { uploadImageDataUri } from '@/lib/cloudinary';
import { isSnapshotMediaKind } from '@/lib/profile-snapshots';
import { createServiceClient } from '@/lib/supabase';

const MEDIA_CONFIG = {
  avatar: {
    field: 'avatar_url',
    folder: 'mechi/profiles/avatar',
    maxSize: 4 * 1024 * 1024,
    transformation: [{ width: 800, height: 800, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' }],
  },
  cover: {
    field: 'cover_url',
    folder: 'mechi/profiles/cover',
    maxSize: 8 * 1024 * 1024,
    transformation: [{ width: 1800, height: 900, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' }],
  },
  snapshot_efootball: {
    field: 'snapshot_efootball_url',
    folder: 'mechi/profiles/snapshots/efootball',
    maxSize: 8 * 1024 * 1024,
    transformation: [
      { width: 1200, height: 675, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' },
    ],
  },
  snapshot_codm: {
    field: 'snapshot_codm_url',
    folder: 'mechi/profiles/snapshots/codm',
    maxSize: 8 * 1024 * 1024,
    transformation: [
      { width: 1200, height: 900, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' },
    ],
  },
  snapshot_pubgm: {
    field: 'snapshot_pubgm_url',
    folder: 'mechi/profiles/snapshots/pubgm',
    maxSize: 8 * 1024 * 1024,
    transformation: [
      { width: 1200, height: 900, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' },
    ],
  },
} as const;

type MediaKind = keyof typeof MEDIA_CONFIG;

function isMediaKind(value: string): value is MediaKind {
  return Object.prototype.hasOwnProperty.call(MEDIA_CONFIG, value);
}

function toSafeProfile(profile: Record<string, unknown>) {
  const { password_hash, ...safeProfile } = profile;
  void password_hash;
  return safeProfile;
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const formData = await request.formData();
    const kindValue = String(formData.get('kind') ?? '');
    const file = formData.get('file');

    if (!isMediaKind(kindValue)) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    const mediaConfig = MEDIA_CONFIG[kindValue];
    if (file.size > mediaConfig.maxSize) {
      const maxSizeMb = Math.round(mediaConfig.maxSize / (1024 * 1024));
      return NextResponse.json({ error: `Image must be ${maxSizeMb}MB or smaller` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    const uploadResult = await uploadImageDataUri({
      dataUri,
      folder: mediaConfig.folder,
      publicId: `${authUser.id}_${kindValue}_${Date.now()}`,
      transformation: mediaConfig.transformation,
    });

    const supabase = createServiceClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ [mediaConfig.field]: uploadResult.secure_url })
      .eq('id', authUser.id)
      .select('*')
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Failed to save profile media' }, { status: 500 });
    }

    return NextResponse.json({ profile: toSafeProfile(profile), kind: kindValue });
  } catch (err) {
    console.error('[Profile Media Upload] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const body = (await request.json()) as { kind?: unknown };
    const kindValue = typeof body.kind === 'string' ? body.kind : '';

    if (!isSnapshotMediaKind(kindValue)) {
      return NextResponse.json({ error: 'Invalid snapshot type' }, { status: 400 });
    }

    const mediaConfig = MEDIA_CONFIG[kindValue];
    const supabase = createServiceClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ [mediaConfig.field]: null })
      .eq('id', authUser.id)
      .select('*')
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Failed to remove snapshot' }, { status: 500 });
    }

    return NextResponse.json({ profile: toSafeProfile(profile), kind: kindValue });
  } catch (err) {
    console.error('[Profile Media Delete] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
