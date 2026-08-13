import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { uploadImageDataUri } from '@/lib/cloudinary';
import { savePassportGameScreenshot } from '@/lib/passport-games';

const MAX_SCREENSHOT_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a screenshot' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Screenshot must be PNG, JPG, or WEBP' }, { status: 400 });
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return NextResponse.json({ error: 'Screenshot must be 6MB or smaller' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadImageDataUri({
    dataUri: `data:${file.type};base64,${buffer.toString('base64')}`,
    folder: 'mechi/passport/games',
    publicId: `${access.profile.id}_${id}_${Date.now()}`,
    transformation: [
      { width: 1400, height: 900, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
    ],
  });
  const result = await savePassportGameScreenshot(access.profile.id, id, uploaded.secure_url, uploaded.public_id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ entry: result.entry });
}
