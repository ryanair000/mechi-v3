import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { ModeratorRegistrationClient } from '@/app/admin/moderators/register/moderator-registration-client';
import { hasAdminAccess } from '@/lib/access';
import { verifyToken } from '@/lib/auth';
import { getLoginPath } from '@/lib/navigation';
import { createServiceClient } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Moderator sign up | Mechi',
  description: 'Independent Mechi moderator sign-up page.',
};

async function getStaffSignupAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload?.sub) {
    return { signedIn: false, isAdmin: false };
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, username, phone, role, is_banned')
    .eq('id', payload.sub)
    .single();

  const isAdmin = Boolean(data && !data.is_banned && hasAdminAccess(data));
  return { signedIn: true, isAdmin };
}

export default async function ModeratorSignupPage() {
  const access = await getStaffSignupAccess();

  return (
    <div
      className="page-base app-prototype-shell min-h-screen"
      data-theme="dark"
      style={{ colorScheme: 'dark' }}
    >
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center">
            <BrandLogo size="sm" variant="reversed" />
          </Link>
          <div className="flex flex-wrap gap-2">
            {access.signedIn ? (
              <Link href="/moderators" className="btn-ghost">
                Moderator desk
              </Link>
            ) : (
              <Link href={getLoginPath('/moderator-signup')} className="btn-ghost">
                Sign in
              </Link>
            )}
            {access.isAdmin ? (
              <Link href="/admin/users?role=moderator" className="btn-ghost">
                Staff list
              </Link>
            ) : null}
          </div>
        </div>

        <ModeratorRegistrationClient
          mode={access.isAdmin ? 'admin' : access.signedIn ? 'self' : 'public'}
        />
      </main>
    </div>
  );
}
