import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { uploadImageDataUri } from '@/lib/cloudinary';
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
} as const;

type MediaKind = keyof typeof MEDIA_CONFIG;

function isMediaKind(value: string): value is MediaKind {
  return value === 'avatar' || value === 'cover';
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
      return NextResponse.json({ error: 'Failed to save profile image' }, { status: 500 });
    }

    const { password_hash, ...safeProfile } = profile;
    void password_hash;
    return NextResponse.json({ profile: safeProfile, kind: kindValue });
  } catch (err) {
    console.error('[Profile Media Upload] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
