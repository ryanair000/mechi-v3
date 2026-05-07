import { randomUUID } from 'node:crypto';
import { after, NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { uploadImageDataUri } from '@/lib/cloudinary';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { sendTestIssueReportTelegramNotification } from '@/lib/telegram';

export const runtime = 'nodejs';

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = await checkPersistentRateLimit(
    `test-issue-report:${clientIp}`,
    RATE_LIMIT_MAX_SUBMISSIONS,
    RATE_LIMIT_WINDOW_MS
  );

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  try {
    const formData = await request.formData();
    const pagePath = normalizeText(formData.get('page_path'));
    const pageUrl = normalizeText(formData.get('page_url'));
    const description = normalizeText(formData.get('description'));
    const screenshot = formData.get('screenshot');

    if (!pagePath) {
      return NextResponse.json({ error: 'Add the page or route where you found the issue.' }, { status: 400 });
    }

    if (!description || description.length < 12) {
      return NextResponse.json(
        { error: 'Add a short description with enough detail to reproduce the issue.' },
        { status: 400 }
      );
    }

    if (!(screenshot instanceof File)) {
      return NextResponse.json({ error: 'Attach a screenshot before submitting the report.' }, { status: 400 });
    }

    if (!screenshot.type.startsWith('image/')) {
      return NextResponse.json({ error: 'The attachment must be an image.' }, { status: 400 });
    }

    if (screenshot.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Screenshot must be 4MB or smaller.' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const authUser = getAuthUser(request);
    let linkedProfile: { id: string; username: string; role: string | null } | null = null;

    if (authUser?.sub) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('id', authUser.sub)
        .maybeSingle();

      if (profile?.id && profile.username) {
        linkedProfile = {
          id: profile.id as string,
          username: profile.username as string,
          role: (profile.role as string | null | undefined) ?? null,
        };
      }
    }

    const fileBuffer = Buffer.from(await screenshot.arrayBuffer());
    const dataUri = `data:${screenshot.type};base64,${fileBuffer.toString('base64')}`;
    const uploadResult = await uploadImageDataUri({
      dataUri,
      folder: 'mechi/test-issue-reports',
      publicId: `test_issue_report_${Date.now()}_${randomUUID().slice(0, 8)}`,
      transformation: [
        {
          width: 1600,
          height: 1600,
          crop: 'limit',
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
    });

    const { data: report, error } = await supabase
      .from('test_issue_reports')
      .insert({
        user_id: linkedProfile?.id ?? null,
        page_path: pagePath,
        page_url: pageUrl || null,
        description,
        screenshot_url: uploadResult.secure_url,
        screenshot_public_id: uploadResult.public_id,
        status: 'new',
        metadata: {
          screenshot_name: screenshot.name || null,
          screenshot_size_bytes: screenshot.size,
          screenshot_type: screenshot.type,
          source_host: request.headers.get('host') ?? null,
          referer: request.headers.get('referer') ?? null,
          user_agent: request.headers.get('user-agent') ?? null,
          reporter_username: linkedProfile?.username ?? null,
          reporter_role: linkedProfile?.role ?? null,
          reporter_ip: clientIp,
        },
      })
      .select('id, status')
      .single();

    if (error || !report) {
      console.error('[Test Issue Reports] Failed to insert report:', error);
      return NextResponse.json({ error: 'Could not save the issue report right now.' }, { status: 500 });
    }

    after(async () => {
      try {
        await sendTestIssueReportTelegramNotification({
          reportId: String(report.id),
          pagePath,
          pageUrl: pageUrl || null,
          description,
          screenshotUrl: uploadResult.secure_url,
          reporterUsername: linkedProfile?.username ?? null,
          reporterRole: linkedProfile?.role ?? null,
        });
      } catch (telegramError) {
        console.error('[Telegram] Test issue report notification error:', telegramError);
      }
    });

    return NextResponse.json(
      {
        reportId: report.id,
        status: report.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Test Issue Reports] Submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
