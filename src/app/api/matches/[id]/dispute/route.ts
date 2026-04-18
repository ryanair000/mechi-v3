import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;
  const { id } = await params;

  try {
    const supabase = createServiceClient();

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.player1_id !== authUser.id && match.player2_id !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (match.status !== 'disputed') {
      return NextResponse.json({ error: 'Match is not in disputed state' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('screenshot') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No screenshot provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: 'mechi/disputes',
      public_id: `match_${id}_${Date.now()}`,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    const screenshotUrl = uploadResult.secure_url;

    // Save URL to match
    const { error: updateError } = await supabase
      .from('matches')
      .update({ dispute_screenshot_url: screenshotUrl })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save screenshot' }, { status: 500 });
    }

    return NextResponse.json({ screenshot_url: screenshotUrl });
  } catch (err) {
    console.error('[Dispute Upload] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
