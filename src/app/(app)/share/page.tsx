'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  Copy,
  RefreshCw,
  Share2,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { InviteMenu } from '@/components/InviteMenu';
import { ShareMenu } from '@/components/ShareMenu';
import { getRankDivision } from '@/lib/gamification';
import {
  copyLink,
  getInvitePath,
  getInviteUrl,
  getProfileOgImageUrl,
  getProfileSharePath,
  getProfileShareStats,
  getProfileShareUrl,
  profileShareText,
} from '@/lib/share';

type ShareProfile = Record<string, unknown> & {
  invite_code?: string | null;
  level?: number;
  selected_games?: string[];
};

export default function SharePage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<ShareProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProfile = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError(null);

      try {
        const res = await authFetch('/api/users/profile');
        const data = (await res.json()) as {
          error?: string;
          profile?: ShareProfile;
        };

        if (!res.ok || !data.profile) {
          setLoadError(data.error ?? 'Could not load your share details right now.');
          return;
        }

        setProfile(data.profile);
      } catch {
        setLoadError('Could not load your share details right now.');
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const username = user?.username ?? '';
  const shareSource =
    profile ?? ((user as unknown as ShareProfile | undefined) ?? ({} as ShareProfile));
  const shareStats = getProfileShareStats(shareSource);
  const strongestRank = getRankDivision(shareStats.bestRating);
  const totalMatches = shareStats.totalWins + shareStats.totalLosses;
  const level =
    typeof profile?.level === 'number'
      ? profile.level
      : typeof user?.level === 'number'
        ? user.level
        : 1;
  const inviteCode =
    typeof profile?.invite_code === 'string'
      ? profile.invite_code
      : user?.invite_code ?? null;
  const profileUrl = username ? getProfileShareUrl(username) : '';
  const profilePath = username ? getProfileSharePath(username) : '';
  const profileShareCopy = username
    ? profileShareText(username, strongestRank.label, level)
    : 'Show off your Mechi profile and bring the next match to you.';
  const inviteUrl = inviteCode ? getInviteUrl(inviteCode) : '';
  const invitePath = inviteCode ? getInvitePath(inviteCode) : '';

  const handleCopy = async (value: string, successMessage: string) => {
    const copied = await copyLink(value);

    if (copied) {
      toast.success(successMessage);
    } else {
      toast.error('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-5">
          <div className="h-48 shimmer rounded-[1.6rem]" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
            <div className="h-64 shimmer rounded-[1.6rem]" />
            <div className="space-y-5">
              <div className="h-40 shimmer rounded-[1.6rem]" />
              <div className="h-40 shimmer rounded-[1.6rem]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Share</p>
            <h1 className="mt-3 text-[1.5rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Turn your profile into something people can actually open.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Use your public profile when you want to be challenged, and use your invite link when you
              want to grow your squad. Both live here so you do not have to hunt for them.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadProfile({ silent: true })}
              disabled={refreshing}
              className="btn-ghost"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link href="/profile" className="btn-ghost">
              Edit profile
            </Link>
            {username ? (
              <ShareMenu
                text={profileShareCopy}
                url={profileUrl}
                title="My Mechi Profile"
                imageUrl={getProfileOgImageUrl(username)}
                imageFilename={`mechi-profile-${username}.png`}
                variant="primary"
              />
            ) : null}
          </div>
        </div>

        {loadError ? (
          <div className="mt-5 rounded-[1.15rem] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => void loadProfile()}
                className="btn-outline border-red-400/30 text-red-50 hover:bg-red-500/10"
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: 'Best rank',
              value: strongestRank.label,
              copy: `Best rating ${shareStats.bestRating}`,
            },
            {
              icon: Share2,
              title: 'Profile card',
              value: `${shareStats.games.length} games`,
              copy:
                shareStats.games.length > 0
                  ? 'Your selected titles shape the public card people see.'
                  : 'Add games on your profile to make the share card stronger.',
            },
            {
              icon: UserPlus,
              title: 'Invite mode',
              value: inviteCode ? 'Ready' : 'Missing',
              copy: inviteCode
                ? 'Your join link is ready to paste anywhere.'
                : 'Invite code not found yet. Refresh after registration syncs.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
                  <item.icon size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.copy}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-title">Profile Share</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Your public challenge card
              </h2>
            </div>
            {username ? (
              <ShareMenu
                text={profileShareCopy}
                url={profileUrl}
                title="My Mechi Profile"
                imageUrl={getProfileOgImageUrl(username)}
                imageFilename={`mechi-profile-${username}.png`}
                variant="ghost"
              />
            ) : null}
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              What people will read
            </p>
            <p className="mt-3 text-lg font-black leading-8 text-[var(--text-primary)]">
              {profileShareCopy}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Strongest rank
                </p>
                <p className="mt-2 text-base font-black text-[var(--text-primary)]">
                  {strongestRank.label}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Level
                </p>
                <p className="mt-2 text-base font-black text-[var(--text-primary)]">Lv. {level}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Record
                </p>
                <p className="mt-2 text-base font-black text-[var(--text-primary)]">
                  {shareStats.totalWins}-{shareStats.totalLosses}
                </p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  {totalMatches > 0 ? `${totalMatches} tracked matches` : 'No tracked matches yet'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <p className="section-title">Quick Links</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Copy or open what you need
            </h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="text-sm font-black text-[var(--text-primary)]">Public profile</p>
                <p className="mt-2 break-all text-sm leading-6 text-[var(--text-secondary)]">
                  {profileUrl || 'Profile link unavailable right now.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCopy(profileUrl, 'Profile link copied')}
                    disabled={!profileUrl}
                    className="btn-ghost"
                  >
                    <Copy size={14} />
                    Copy link
                  </button>
                  {profilePath ? (
                    <Link href={profilePath} className="btn-primary">
                      Open public page
                      <ArrowUpRight size={14} />
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">Invite link</p>
                    <p className="mt-2 break-all text-sm leading-6 text-[var(--text-secondary)]">
                      {inviteUrl || 'Invite link unavailable right now.'}
                    </p>
                  </div>
                  {inviteCode && username ? (
                    <InviteMenu inviteCode={inviteCode} username={username} />
                  ) : (
                    <span className="brand-chip-coral px-3 py-1">Invite unavailable</span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCopy(inviteUrl, 'Invite link copied')}
                    disabled={!inviteUrl}
                    className="btn-ghost"
                  >
                    <Copy size={14} />
                    Copy invite
                  </button>
                  {invitePath ? (
                    <Link href={invitePath} className="btn-ghost">
                      Open invite page
                      <ArrowUpRight size={14} />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title">Best Uses</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Share with intent
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                Drop your public profile when you want someone to size up your rank, games, and recent
                record before challenging you.
              </p>
              <p>
                Use the invite link in WhatsApp groups when the goal is getting more friends into Mechi,
                not just showing off your card.
              </p>
              <p>
                Tighten your profile on the settings page first if you want your public page to hit harder.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/profile#settings" className="btn-primary">
                Improve profile
              </Link>
              <Link href="/leaderboard" className="btn-ghost">
                Find opponents
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
