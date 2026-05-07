import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import { verifyToken } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import EmailOpsClient, { type EmailCampaignSummary } from './email-ops-client';

export default async function AdminEmailPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  const supabase = createServiceClient();

  if (!payload?.sub) {
    redirect('/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('phone, role, is_banned')
    .eq('id', payload.sub)
    .single();

  if (!profile || profile.is_banned || !hasPrimaryAdminAccess(profile)) {
    redirect('/admin');
  }

  const [{ count: profileEmailCount }, { count: unsubscribedCount }, campaignsResult] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).not('email', 'is', null),
      supabase
        .from('email_unsubscribes')
        .select('id', { count: 'exact', head: true })
        .eq('scope', 'broadcast'),
      supabase
        .from('admin_email_campaigns')
        .select('id, subject, status, recipient_count, sent_count, failed_count, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

  return (
    <EmailOpsClient
      profileEmailCount={profileEmailCount ?? 0}
      unsubscribedCount={unsubscribedCount ?? 0}
      recentCampaigns={(campaignsResult.data ?? []) as EmailCampaignSummary[]}
    />
  );
}
