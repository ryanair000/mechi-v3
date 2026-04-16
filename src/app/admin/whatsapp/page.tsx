import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import WhatsAppOpsClient from './whatsapp-ops-client';

export default async function AdminWhatsAppPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  const supabase = createServiceClient();

  if (!payload?.sub) {
    redirect('/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', payload.sub)
    .single();

  if (!profile || profile.is_banned || profile.role !== 'admin') {
    redirect('/admin');
  }

  return <WhatsAppOpsClient />;
}
