'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  Copy,
  Globe2,
  RefreshCw,
  Share2,
  Sparkles,
  Swords,
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

const DAILY_SHARE_REWARD_POINTS = 25;

export default function SharePage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<ShareProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPageData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError(null);

      try {
        const response = await authFetch('/api/users/profile');
        const data = (await response.json().catch(() => null)) as
          | { error?: string; profile?: ShareProfile }
          | null;

        if (!response.ok || !data?.profile) {
          throw new Error(data?.error ?? 'Could not load your share details right now.');
        }

        setProfile(data.profile);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : 'Could not load your share details right now.'
        );
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
    void loadPageData();
  }, [loadPageData]);

  const recordShareAction = useCallback(
    async (action: string) => {
      try {
        const response = await authFetch('/api/rewards/share-action', {
          method: 'POST',
          body: JSON.stringify({ action }),
        });
        const data = (await response.json().catch(() => null)) as
          | { awarded?: boolean; error?: string }
          | null;

        if (response.ok && data?.awarded) {
          toast.success(`Share recorded. +${DAILY_SHARE_REWARD_POINTS} RP added.`);
        }
      } catch {
        // Best effort only.
      }
    },
    [authFetch]
  );

  const handleCopy = useCallback(
    async (value: string, successMessage: string, rewardAction?: string) => {
      const copied = await copyLink(value);

      if (!copied) {
        toast.error('Failed to copy');
        return;
      }

      toast.success(successMessage);
      if (rewardAction) {
        void recordShareAction(rewardAction);
      }
    },
    [recordShareAction]
  );

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

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-5">
          <div className="h-56 shimmer rounded-[1.6rem]" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
            <div className="h-80 shimmer rounded-[1.6rem]" />
            <div className="space-y-5">
              <div className="h-56 shimmer rounded-[1.6rem]" />
              <div className="h-48 shimmer rounded-[1.6rem]" />
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
              Put your public card and invite link to work without the rewards noise.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Share your profile when you want opponents to size you up quickly, and pass your invite
              link around when you want more players landing in Mechi. Rewards now live on their own
              dedicated page.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadPageData({ silent: true })}
              disabled={refreshing}
              className="btn-ghost"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link href="/profile" className="btn-ghost">
              Edit profile
            </Link>
            <Link href="/rewards" className="btn-primary">
              Open rewards
            </Link>
            {username ? (
              <ShareMenu
                text={profileShareCopy}
                url={profileUrl}
                title="My Mechi Profile"
                imageUrl={getProfileOgImageUrl(username)}
                imageFilename={`mechi-profile-${username}.png`}
                variant="primary"
                onShared={recordShareAction}
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
                onClick={() => void loadPageData()}
                className="btn-outline border-red-400/30 text-red-50 hover:bg-red-500/10"
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {[
            {
              icon: Sparkles,
              title: 'Strongest rank',
              value: strongestRank.label,
              copy: `Best rating ${shareStats.bestRating}`,
            },
            {
              icon: Swords,
              title: 'Tracked matches',
              value: totalMatches.toLocaleString(),
              copy:
                totalMatches > 0
                  ? `${shareStats.totalWins}-${shareStats.totalLosses} current record.`
                  : 'No tracked matches yet.',
            },
            {
              icon: Globe2,
              title: 'Public profile',
              value: profileUrl ? 'Ready' : 'Missing',
              copy: profileUrl
                ? 'Your public challenge card is ready to send.'
                : 'Set a username to unlock your public page.',
            },
            {
              icon: UserPlus,
              title: 'Invite mode',
              value: inviteCode ? 'Ready' : 'Missing',
              copy: inviteCode
                ? 'Your direct invite link is ready to share.'
                : 'Invite code unavailable right now.',
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
        <div className="space-y-5">
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
                  onShared={recordShareAction}
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

            <div className="mt-4 space-y-3">
              <div className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="text-sm font-black text-[var(--text-primary)]">Public profile</p>
                <p className="mt-2 break-all text-sm leading-6 text-[var(--text-secondary)]">
                  {profileUrl || 'Profile link unavailable right now.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCopy(profileUrl, 'Profile link copied', 'profile_link_copy')}
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
                    <InviteMenu inviteCode={inviteCode} username={username} onShared={recordShareAction} />
                  ) : (
                    <span className="brand-chip-coral px-3 py-1">Invite unavailable</span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCopy(inviteUrl, 'Invite link copied', 'invite_link_copy')}
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
            <p className="section-title">Next Page</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Rewards moved out cleanly
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Track RP, ChezaHub linking, redemption codes, and the reward ledger on the dedicated rewards
              page. This share page stays focused on profile and invite distribution.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/rewards" className="btn-primary">
                <Share2 size={14} />
                Open rewards
              </Link>
              <Link href="/profile/settings" className="btn-ghost">
                Improve profile
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-5">
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
                Use the invite link in WhatsApp groups when the goal is getting more players into Mechi
                and more opponents into your next run.
              </p>
              <p>
                Every verified share action can still count toward your daily rewards. Use the rewards page
                when you want to track the RP side of that activity.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/profile/settings" className="btn-primary">
                Improve profile
              </Link>
              <Link href="/leaderboard" className="btn-ghost">
                Find opponents
              </Link>
              <Link href="/rewards" className="btn-ghost">
                Open rewards
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
