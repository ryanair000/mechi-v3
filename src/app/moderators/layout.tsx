import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { ModeratorShellClient } from '@/components/ModeratorShellClient';
import { hasModeratorAccess } from '@/lib/access';
import { verifyToken } from '@/lib/auth';
import {
  DEFAULT_MODERATOR_TOURNAMENT_KEY,
  getModeratorTournamentByKey,
  isModeratorTournamentKey,
  type ModeratorTournamentKey,
} from '@/lib/moderator-tournaments';
import { getModeratorLoginPath } from '@/lib/navigation';
import { createServiceClient } from '@/lib/supabase';
import type { UserRole } from '@/types';

type ModeratorShellProfile = {
  id: string;
  username: string;
  phone: string;
  role: UserRole;
  is_banned: boolean;
  moderatorTournamentKey: ModeratorTournamentKey;
};

function readModeratorTournamentKeyFromGameIds(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_MODERATOR_TOURNAMENT_KEY;
  }

  const rawKey = (value as Record<string, unknown>).moderator_tournament_key;
  return isModeratorTournamentKey(rawKey) ? rawKey : DEFAULT_MODERATOR_TOURNAMENT_KEY;
}

async function getModeratorProfile(): Promise<ModeratorShellProfile | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload?.sub) {
    return null;
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, username, phone, role, is_banned, game_ids')
    .eq('id', payload.sub)
    .single();

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    username: data.username as string,
    phone: (data.phone as string | null | undefined) ?? '',
    role: ((data.role as UserRole | null) ?? 'user') as UserRole,
    is_banned: Boolean(data.is_banned),
    moderatorTournamentKey: readModeratorTournamentKeyFromGameIds(data.game_ids),
  };
}

export default async function ModeratorsLayout({ children }: { children: React.ReactNode }) {
  const profile = await getModeratorProfile();

  if (!profile) {
    redirect(getModeratorLoginPath('/moderators'));
  }

  if (!hasModeratorAccess(profile) || profile.is_banned) {
    return (
      <div
        className="page-base app-prototype-shell min-h-screen"
        data-theme="dark"
        style={{ colorScheme: 'dark' }}
      >
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8">
          <section className="card p-6 sm:p-8">
            <div className="flex max-w-2xl flex-col gap-4 sm:flex-row sm:items-start">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/10 text-amber-200">
                <ShieldAlert size={20} />
              </span>
              <div>
                <p className="section-title">Moderators</p>
                <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  Moderator access required
                </h1>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  This workspace is only available to Mechi moderator and admin accounts.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const moderatorTournament = getModeratorTournamentByKey(profile.moderatorTournamentKey);

  return (
    <ModeratorShellClient
      profile={{ role: profile.role, username: profile.username }}
      tournament={{
        game: moderatorTournament.game,
        label: moderatorTournament.label,
        shortLabel: moderatorTournament.shortLabel,
      }}
    >
      {children}
    </ModeratorShellClient>
  );
}
