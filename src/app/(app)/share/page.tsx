'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpRight, Copy, Globe2, RefreshCw, UserPlus } from 'lucide-react';
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

  const scrollToSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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
  const inviteUrl = inviteCode ? getInviteUrl(inviteCode) : '';
  const invitePath = inviteCode ? getInvitePath(inviteCode) : '';
  const profileShareCopy = username
    ? profileShareText(username, strongestRank.label, level)
    : 'Set a username to unlock your public Mechi profile.';

  const metaItems = [
    `Rank ${strongestRank.label}`,
    `Lv. ${level}`,
    totalMatches > 0
      ? `Record ${shareStats.totalWins}-${shareStats.totalLosses}`
      : 'No tracked matches yet',
  ];

  const statusCards = [
    {
      icon: UserPlus,
      eyebrow: 'Invite ready',
      value: inviteUrl ? 'Ready' : 'Needs a code',
      copy: inviteUrl
        ? 'Your quick invite link is live and ready to send.'
        : 'Refresh or check back when your invite code is available.',
      detail: inviteCode ? `Code ${inviteCode}` : 'Invite code unavailable',
    },
    {
      icon: Globe2,
      eyebrow: 'Public profile',
      value: profileUrl ? 'Ready' : 'Needs a username',
      copy: profileUrl
        ? 'Your public card is live and easy to share.'
        : 'Pick a username in Profile to unlock your public page.',
      detail: profilePath || 'Public profile unavailable',
    },
  ];

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-5">
          <div className="h-56 shimmer rounded-[1.6rem]" />
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="h-80 shimmer rounded-[1.6rem]" />
            <div className="h-80 shimmer rounded-[1.6rem]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="section-title">Share</p>
          <button
            type="button"
            onClick={() => void loadPageData({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : undefined} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>

        <div className="mt-3 max-w-2xl">
          <h1 className="text-[1.5rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
            Invite friends fast.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Use one link to bring people into Mechi, and one public profile to show them who they
            are playing.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => scrollToSection('share-invite-card')}
            className="btn-primary justify-center"
          >
            <UserPlus size={14} />
            Invite friends
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('share-profile-card')}
            className="btn-outline justify-center"
          >
            <Globe2 size={14} />
            Share profile
          </button>
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

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {statusCards.map((item) => (
            <div
              key={item.eyebrow}
              className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
                  <item.icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {item.eyebrow}
                  </p>
                  <p className="mt-2 text-xl font-black text-[var(--text-primary)]">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.copy}</p>
                  <p className="mt-2 truncate text-xs text-[var(--text-soft)]">{item.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-soft)]">
          {metaItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
          <Link
            href="/profile"
            className="font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Edit profile
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div id="share-invite-card" className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-title">Invite Friends</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Send one link and keep it moving
              </h2>
            </div>
            {inviteCode && username ? (
              <InviteMenu inviteCode={inviteCode} username={username} variant="primary" onShared={recordShareAction} />
            ) : (
              <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Unavailable
              </span>
            )}
          </div>

          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Use this when the goal is getting a new player into Mechi fast.
          </p>

          <div className="mt-4 rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
              Invite link
            </p>
            <p className="mt-2 break-all text-sm leading-6 text-[var(--text-secondary)]">
              {inviteUrl || 'Invite link unavailable right now.'}
            </p>
            <p className="mt-3 text-xs text-[var(--text-soft)]">
              {inviteCode ? `Invite code: ${inviteCode}` : 'Refresh later if your code is still loading.'}
            </p>
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

        <div id="share-profile-card" className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-title">Public Profile</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Let people size you up fast
              </h2>
            </div>
            {profileUrl && username ? (
              <ShareMenu
                text={profileShareCopy}
                url={profileUrl}
                title="My Mechi Profile"
                imageUrl={getProfileOgImageUrl(username)}
                imageFilename={`mechi-profile-${username}.png`}
                variant="primary"
                onShared={recordShareAction}
              />
            ) : (
              <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Need username
              </span>
            )}
          </div>

          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Use your public card when you want people to see your level, rank, and match record at a
            glance.
          </p>

          <div className="mt-4 rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
              Profile preview
            </p>
            <p className="mt-3 text-base font-black leading-7 text-[var(--text-primary)]">
              {profileShareCopy}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-soft)]">
              <span className="rounded-full border border-[var(--border-color)] px-3 py-1">
                {strongestRank.label}
              </span>
              <span className="rounded-full border border-[var(--border-color)] px-3 py-1">
                Lv. {level}
              </span>
              <span className="rounded-full border border-[var(--border-color)] px-3 py-1">
                {totalMatches > 0
                  ? `${shareStats.totalWins}-${shareStats.totalLosses} record`
                  : 'No record yet'}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
              Public link
            </p>
            <p className="mt-2 break-all text-sm leading-6 text-[var(--text-secondary)]">
              {profileUrl || 'Public profile link unavailable right now.'}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleCopy(profileUrl, 'Profile link copied', 'profile_link_copy')}
              disabled={!profileUrl}
              className="btn-ghost"
            >
              <Copy size={14} />
              Copy profile link
            </button>
            {profilePath ? (
              <Link href={profilePath} className="btn-ghost">
                Open public page
                <ArrowUpRight size={14} />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <p className="mt-5 text-xs leading-6 text-[var(--text-soft)]">
        Verified shares can still earn RP once per day.{' '}
        <Link
          href="/rewards"
          className="font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          Track that on Rewards
        </Link>
        .
      </p>
    </div>
  );
}
