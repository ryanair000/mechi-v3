import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import {
  claimDeliveryEvent,
  markDeliveryEventFailed,
  markDeliveryEventSent,
} from '@/lib/email-delivery-events';
import {
  buildEmailUnsubscribeUrl,
  getUnsubscribedEmailSet,
  normalizePreferenceEmail,
} from '@/lib/email-preferences';
import { isTransactionalEmailReady, sendClientMarketingEmail } from '@/lib/email';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';

type AudienceType = 'all_profiles' | 'manual';

type Recipient = {
  email: string;
  normalizedEmail: string;
  userId?: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_SEND_LIMIT = 200;
const PROFILE_PAGE_SIZE = 500;

function getSendLimit() {
  const parsed = Number.parseInt(process.env.ADMIN_EMAIL_SEND_LIMIT ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SEND_LIMIT;
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAudienceType(value: unknown): AudienceType {
  return value === 'manual' ? 'manual' : 'all_profiles';
}

function parseManualRecipients(value: unknown) {
  const raw =
    typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string').join(',')
        : '';

  return raw
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function dedupeRecipients(recipients: Recipient[]) {
  const deduped = new Map<string, Recipient>();
  for (const recipient of recipients) {
    if (EMAIL_PATTERN.test(recipient.normalizedEmail) && !deduped.has(recipient.normalizedEmail)) {
      deduped.set(recipient.normalizedEmail, recipient);
    }
  }

  return Array.from(deduped.values());
}

function hashRecipientForKey(email: string) {
  return createHash('sha256').update(normalizePreferenceEmail(email)).digest('hex').slice(0, 24);
}

async function loadAudienceRecipients(audienceType: AudienceType, manualRecipients: unknown) {
  const supabase = createServiceClient();

  if (audienceType === 'manual') {
    return dedupeRecipients(
      parseManualRecipients(manualRecipients).map((email) => ({
        email,
        normalizedEmail: normalizePreferenceEmail(email),
      }))
    );
  }

  const recipients = new Map<string, Recipient>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .not('email', 'is', null)
      .range(offset, offset + PROFILE_PAGE_SIZE - 1);

    if (error) {
      console.error('[Admin Email Campaign] Audience load error:', error);
      throw new Error('Could not load email audience');
    }

    const rows = (data ?? []) as Array<{ id: string; email?: string | null }>;
    for (const row of rows) {
      const normalizedEmail = normalizePreferenceEmail(row.email);
      if (EMAIL_PATTERN.test(normalizedEmail) && !recipients.has(normalizedEmail)) {
        recipients.set(normalizedEmail, {
          email: normalizedEmail,
          normalizedEmail,
          userId: row.id,
        });
      }
    }

    if (rows.length < PROFILE_PAGE_SIZE) {
      break;
    }

    offset += PROFILE_PAGE_SIZE;
  }

  return Array.from(recipients.values());
}

async function filterOptedInRecipients(recipients: Recipient[]) {
  const supabase = createServiceClient();
  const unsubscribed = await getUnsubscribedEmailSet(
    supabase,
    recipients.map((recipient) => recipient.email),
    'broadcast'
  );

  return recipients.filter((recipient) => !unsubscribed.has(recipient.normalizedEmail));
}

async function updateRecipientStatus(params: {
  campaignId: string;
  normalizedEmail: string;
  status: 'sent' | 'failed' | 'skipped';
  deliveryEventKey?: string | null;
  error?: string | null;
}) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('admin_email_campaign_recipients')
    .update({
      status: params.status,
      delivery_event_key: params.deliveryEventKey ?? null,
      error: params.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('campaign_id', params.campaignId)
    .eq('normalized_email', params.normalizedEmail);

  if (error) {
    console.error('[Admin Email Campaign] Recipient status update error:', error);
  }
}

export async function POST(request: NextRequest) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasAdminAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rateLimit = await checkPersistentRateLimit(
      `admin-email-campaign:${admin.id}:${getClientIp(request)}`,
      6,
      30 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const audienceType = normalizeAudienceType(body.audience_type);
    const subject = getString(body.subject);
    const title = getString(body.title) || subject;
    const bodyText = getString(body.body_text);
    const ctaLabel = getString(body.cta_label) || null;
    const ctaUrl = getString(body.cta_url) || null;
    const dryRun = body.dry_run === true;
    const confirmText = getString(body.confirm_text);
    const sendLimit = getSendLimit();

    if (subject.length < 3 || subject.length > 140) {
      return NextResponse.json({ error: 'Subject must be 3-140 characters.' }, { status: 400 });
    }

    if (title.length < 3 || title.length > 140) {
      return NextResponse.json({ error: 'Title must be 3-140 characters.' }, { status: 400 });
    }

    if (bodyText.length < 10 || bodyText.length > 5000) {
      return NextResponse.json({ error: 'Message body must be 10-5000 characters.' }, { status: 400 });
    }

    if (ctaUrl && !ctaUrl.startsWith('https://') && !ctaUrl.startsWith('http://') && !ctaUrl.startsWith('/')) {
      return NextResponse.json({ error: 'CTA URL must be a valid http(s) URL or app path.' }, { status: 400 });
    }

    if (ctaUrl && !ctaLabel) {
      return NextResponse.json({ error: 'CTA label is required when a CTA URL is set.' }, { status: 400 });
    }

    const allRecipients = await loadAudienceRecipients(audienceType, body.recipients);
    const recipients = await filterOptedInRecipients(allRecipients);

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No opted-in recipients found.' }, { status: 400 });
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        audienceType,
        recipientCount: recipients.length,
        skippedByUnsubscribe: allRecipients.length - recipients.length,
        overLimit: recipients.length > sendLimit,
        sendLimit,
        sample: recipients.slice(0, 10).map((recipient) => recipient.email),
      });
    }

    if (confirmText !== 'SEND EMAIL') {
      return NextResponse.json({ error: 'Type SEND EMAIL to confirm this campaign.' }, { status: 400 });
    }

    if (!isTransactionalEmailReady()) {
      return NextResponse.json({ error: 'Email delivery is not configured.' }, { status: 503 });
    }

    if (recipients.length > sendLimit) {
      return NextResponse.json(
        { error: `Recipient count exceeds ADMIN_EMAIL_SEND_LIMIT (${sendLimit}).` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const campaignId = randomUUID();
    const nowIso = new Date().toISOString();
    const { error: campaignError } = await supabase.from('admin_email_campaigns').insert({
      id: campaignId,
      admin_id: admin.id,
      audience_type: audienceType,
      subject,
      title,
      body_text: bodyText,
      cta_label: ctaLabel,
      cta_url: ctaUrl,
      status: 'sending',
      recipient_count: recipients.length,
      metadata: {
        skipped_by_unsubscribe: allRecipients.length - recipients.length,
      },
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (campaignError) {
      console.error('[Admin Email Campaign] Campaign insert error:', campaignError);
      return NextResponse.json({ error: 'Could not create campaign record.' }, { status: 500 });
    }

    const { error: recipientsError } = await supabase
      .from('admin_email_campaign_recipients')
      .insert(
        recipients.map((recipient) => ({
          campaign_id: campaignId,
          email: recipient.email,
          normalized_email: recipient.normalizedEmail,
          status: 'pending',
        }))
      );

    if (recipientsError) {
      console.error('[Admin Email Campaign] Recipient insert error:', recipientsError);
      return NextResponse.json({ error: 'Could not create recipient records.' }, { status: 500 });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      const eventKey = [
        'admin-email-campaign',
        campaignId,
        hashRecipientForKey(recipient.normalizedEmail),
      ].join(':');
      const metadata = {
        campaign_id: campaignId,
        audience_type: audienceType,
        subject,
      };
      const didClaim = await claimDeliveryEvent(supabase, {
        eventKey,
        eventType: 'admin_email_campaign',
        recipient: recipient.email,
        userId: recipient.userId ?? null,
        metadata,
      });

      if (!didClaim) {
        failedCount += 1;
        await updateRecipientStatus({
          campaignId,
          normalizedEmail: recipient.normalizedEmail,
          status: 'skipped',
          deliveryEventKey: eventKey,
          error: 'Delivery event already claimed.',
        });
        continue;
      }

      try {
        await sendClientMarketingEmail({
          to: recipient.email,
          subject,
          title,
          bodyText,
          ctaLabel,
          ctaUrl,
          unsubscribeUrl: buildEmailUnsubscribeUrl(recipient.email, 'broadcast'),
        });
        sentCount += 1;
        await markDeliveryEventSent(supabase, {
          eventKey,
          metadata: { ...metadata, sent_at: new Date().toISOString() },
        });
        await updateRecipientStatus({
          campaignId,
          normalizedEmail: recipient.normalizedEmail,
          status: 'sent',
          deliveryEventKey: eventKey,
        });
      } catch (error) {
        failedCount += 1;
        await markDeliveryEventFailed(supabase, {
          eventKey,
          error,
          metadata: { ...metadata, failed_at: new Date().toISOString() },
        });
        await updateRecipientStatus({
          campaignId,
          normalizedEmail: recipient.normalizedEmail,
          status: 'failed',
          deliveryEventKey: eventKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const status = failedCount === 0 ? 'sent' : sentCount > 0 ? 'partial_failure' : 'failed';
    await supabase
      .from('admin_email_campaigns')
      .update({
        status,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    await writeAuditLog({
      adminId: admin.id,
      action: 'send_email_campaign',
      targetType: 'system',
      targetId: campaignId,
      details: {
        audience_type: audienceType,
        subject,
        recipient_count: recipients.length,
        sent_count: sentCount,
        failed_count: failedCount,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      ok: true,
      campaignId,
      status,
      recipientCount: recipients.length,
      sentCount,
      failedCount,
      skippedByUnsubscribe: allRecipients.length - recipients.length,
    });
  } catch (error) {
    console.error('[Admin Email Campaign] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
