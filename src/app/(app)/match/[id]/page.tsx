'use client';

import Image from 'next/image';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Check,
  Clock,
  ExternalLink,
  ImageIcon,
  Swords,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import {
  GAMES,
  PLATFORMS,
  getGameIdValue,
  getMatchingPlatform,
  getPlatformAddUrl,
} from '@/lib/config';
import { PlatformBadge } from '@/components/PlatformBadge';
import { PlatformLogo } from '@/components/PlatformLogo';
import { RatingBadge } from '@/components/RatingBadge';
import type { GameKey, GamificationResult, PlatformKey } from '@/types';

interface MatchPlayer {
  id: string;
  username: string;
  game_ids: Record<string, string>;
  platforms: PlatformKey[];
}

interface MatchData {
  id: string;
  player1_id: string;
  player2_id: string;
  game: GameKey;
  platform?: PlatformKey | null;
  region: string;
  status: 'pending' | 'completed' | 'disputed' | 'cancelled';
  winner_id: string | null;
  player1_reported_winner: string | null;
  player2_reported_winner: string | null;
  rating_change_p1: number | null;
  rating_change_p2: number | null;
  gamification_summary_p1?: GamificationResult | null;
  gamification_summary_p2?: GamificationResult | null;
  dispute_screenshot_url: string | null;
  dispute_requested_by: string | null;
  created_at: string;
  player1: MatchPlayer;
  player2: MatchPlayer;
}

const QUICK_RESULT_COMMENTS = ['GG', 'Close one', 'Lucky', 'Run it back'] as const;

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [selectedQuickComment, setSelectedQuickComment] = useState<string | null>(null);
  const [sentQuickComment, setSentQuickComment] = useState<string | null>(null);
  const [receivedQuickComment, setReceivedQuickComment] = useState<{
    from: string;
    comment: string;
  } | null>(null);
  const [keepResultOpen, setKeepResultOpen] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<{ send: (payload: unknown) => Promise<unknown> } | null>(null);

  const fetchMatch = useCallback(async () => {
    const res = await authFetch(`/api/matches/${matchId}`);
    if (res.ok) {
      const data = await res.json();
      setMatch(data.match);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  }, [authFetch, matchId, router]);

  useEffect(() => {
    void fetchMatch();
    const supabase = createClient();
    const channel = supabase
      .channel(`match_${matchId}`)
      .on(
        'broadcast',
        { event: 'result-comment' },
        ({ payload }) => {
          const nextPayload = payload as
            | {
                comment?: string;
                fromUserId?: string;
                fromUsername?: string;
              }
            | undefined;

          if (!nextPayload?.comment || nextPayload.fromUserId === user?.id) {
            return;
          }

          const note = {
            from: nextPayload.fromUsername ?? 'Opponent',
            comment: nextPayload.comment,
          };

          setReceivedQuickComment(note);
          toast(`${note.from}: ${note.comment}`, {
            icon: '💬',
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        () => {
          void fetchMatch();
        }
      )
      .subscribe();

    channelRef.current = channel as unknown as { send: (payload: unknown) => Promise<unknown> };

    return () => {
      channelRef.current = null;
      channel.unsubscribe();
    };
  }, [matchId, fetchMatch, user?.id]);

  useEffect(() => {
    if (match?.status !== 'completed') {
      setAutoCloseCountdown(null);
      setKeepResultOpen(false);
      return;
    }

    if (!keepResultOpen) {
      setAutoCloseCountdown((current) => current ?? 8);
    }
  }, [match?.status, keepResultOpen]);

  useEffect(() => {
    if (autoCloseCountdown === null || keepResultOpen) {
      return;
    }

    if (autoCloseCountdown <= 0) {
      router.push('/dashboard');
      return;
    }

    const timer = window.setTimeout(() => {
      setAutoCloseCountdown((current) =>
        current === null ? null : current - 1
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [autoCloseCountdown, keepResultOpen, router]);

  const handleReport = async (winnerId: string) => {
    setReporting(winnerId);
    try {
      const res = await authFetch(`/api/matches/${matchId}/report`, {
        method: 'POST',
        body: JSON.stringify({ winner_id: winnerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to report');
        return;
      }

      if (selectedQuickComment && channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'result-comment',
          payload: {
            comment: selectedQuickComment,
            fromUserId: user?.id,
            fromUsername: user?.username ?? 'Player',
          },
        });
        setSentQuickComment(selectedQuickComment);
        setSelectedQuickComment(null);
      }

      if (data.status === 'completed') {
        toast.success('Match completed! Your climb is updated.');
      } else if (data.status === 'disputed') {
        toast.error('Result disputed! Upload a screenshot.');
      } else {
        toast.success('Result reported. Waiting for opponent...');
      }
      void fetchMatch();
    } catch {
      toast.error('Network error');
    } finally {
      setReporting(null);
    }
  };

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }

    setUploadingScreenshot(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', file);
      const res = await fetch(`/api/matches/${matchId}/dispute`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed');
        return;
      }
      toast.success('Screenshot uploaded');
      void fetchMatch();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingScreenshot(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this match?')) return;
    setCancelling(true);
    try {
      const res = await authFetch(`/api/matches/${matchId}/cancel`, { method: 'POST' });
      if (res.ok) {
        toast.success('Match cancelled');
        router.push('/dashboard');
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to cancel');
      }
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[var(--brand-teal)] border-t-transparent" />
          <p className="text-sm text-[var(--text-soft)]">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match || !user) return null;

  const isPlayer1 = user.id === match.player1_id;
  const me = isPlayer1 ? match.player1 : match.player2;
  const opponent = isPlayer1 ? match.player2 : match.player1;
  const game = GAMES[match.game];
  const gamePlatforms = game?.platforms ?? [];
  const myPlatform = getMatchingPlatform(me.platforms, gamePlatforms);
  const opponentPlatform = getMatchingPlatform(opponent.platforms, gamePlatforms);
  const displayPlatform = match.platform ?? opponentPlatform ?? myPlatform;
  const opponentPlatformId = displayPlatform
    ? getGameIdValue(opponent.game_ids ?? {}, match.game, displayPlatform) || 'Not set'
    : 'Not set';
  const gamificationResult = isPlayer1
    ? match.gamification_summary_p1 ?? null
    : match.gamification_summary_p2 ?? null;
  const iWon = match.winner_id === user.id;
  const myReport = isPlayer1 ? match.player1_reported_winner : match.player2_reported_winner;
  const opponentReport = isPlayer1 ? match.player2_reported_winner : match.player1_reported_winner;
  const platformAddUrl = displayPlatform
    ? getPlatformAddUrl(displayPlatform, opponentPlatformId)
    : null;
  const resultHeading = iWon ? 'Victory locked in' : 'Tough one';
  const resultCopy = iWon
    ? 'Both players confirmed it. Your win, streak, and climb progress are now locked in.'
    : 'Both players confirmed the result. The match is closed and your climb progress is updated.';

  const statusTone =
    match.status === 'completed'
      ? 'bg-[rgba(50,224,196,0.12)] text-[var(--brand-teal)]'
      : match.status === 'disputed'
        ? 'bg-red-500/10 text-red-500'
        : match.status === 'pending'
          ? 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
          : 'bg-[var(--surface-elevated)] text-[var(--text-soft)]';

  return (
    <div className="page-container">
      <div className="mx-auto max-w-2xl">
        <div className="card circuit-panel mb-6 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Swords size={16} className="text-[var(--brand-coral)]" />
            <span className="text-sm font-semibold text-[var(--brand-coral)]">
              {game?.label}
            </span>
            <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone}`}>
              {match.status === 'pending' && <Clock size={10} />}
              {match.status === 'completed' && <Check size={10} />}
              {match.status === 'disputed' && <AlertTriangle size={10} />}
              {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xl font-bold text-[var(--text-primary)]">{me.username}</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">You</p>
            </div>
            <span className="px-4 text-lg font-bold text-[var(--text-soft)]">VS</span>
            <div className="flex-1 text-right">
              <p className="text-xl font-bold text-[var(--text-primary)]">{opponent.username}</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Opponent</p>
            </div>
          </div>
        </div>

        <div className="card mb-4 p-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Connect with Opponent</h3>
          {displayPlatform ? (
            <>
              <div className="mb-3 flex items-start gap-3">
                <span className="mt-0.5">
                  <PlatformLogo platform={displayPlatform} size={22} />
                </span>
                <div className="flex-1">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Playing {game?.label} on {PLATFORMS[displayPlatform]?.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                    {PLATFORMS[displayPlatform]?.idLabel}:{' '}
                    <span className="text-[var(--brand-teal)]">{opponentPlatformId}</span>
                  </p>
                </div>
              </div>
              {platformAddUrl && (
                <a
                  href={platformAddUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline w-full text-sm"
                >
                  <ExternalLink size={14} /> Add on {PLATFORMS[displayPlatform]?.label}
                </a>
              )}
            </>
          ) : (
            <p className="py-4 text-center text-sm text-[var(--text-soft)]">
              Platform info not available
            </p>
          )}
          <div className="mt-3 border-t border-[var(--border-color)] pt-3">
            <p className="mb-2 text-xs text-[var(--text-soft)]">Opponent&apos;s platforms</p>
            <div className="flex flex-wrap gap-2">
              {opponent.platforms.map((platform) => (
                <PlatformBadge
                  key={platform}
                  platform={platform}
                  platformId={platform === displayPlatform ? opponentPlatformId : opponent.game_ids?.[platform]}
                  size="sm"
                />
              ))}
            </div>
          </div>
        </div>

        {match.status === 'pending' && (
          <div className="card mb-4 p-5">
            <h3 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Report Result</h3>
            <p className="mb-4 text-xs text-[var(--text-secondary)]">
              Both players must agree on the result.
            </p>
            {!myReport && (
              <div className="mb-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Quick comment
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_RESULT_COMMENTS.map((comment) => {
                    const isSelected = selectedQuickComment === comment;

                    return (
                      <button
                        key={comment}
                        type="button"
                        onClick={() =>
                          setSelectedQuickComment((current) =>
                            current === comment ? null : comment
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'border-[rgba(50,224,196,0.26)] bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                            : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[rgba(255,107,107,0.22)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {comment}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-[var(--text-soft)]">
                  Optional. Pick one and Mechi sends it live with your report.
                </p>
              </div>
            )}
            {myReport ? (
              <div className="surface-live mb-3 rounded-xl p-3">
                <p className="text-sm font-medium text-[var(--accent-secondary-text)]">
                  You reported:{' '}
                  <strong>{myReport === user.id ? 'You won' : `${opponent.username} won`}</strong>
                </p>
                {sentQuickComment && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Your note: <span className="font-semibold text-[var(--text-primary)]">{sentQuickComment}</span>
                  </p>
                )}
                {!opponentReport && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Waiting for opponent...
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleReport(user.id)}
                  disabled={!!reporting}
                  className="btn-primary flex flex-col items-center gap-1 py-4"
                >
                  <Check size={18} />
                  <span className="text-sm">I Won</span>
                </button>
                <button
                  onClick={() => handleReport(opponent.id)}
                  disabled={!!reporting}
                  className="btn-outline flex flex-col items-center gap-1 py-4"
                >
                  <X size={18} />
                  <span className="text-sm">{opponent.username} Won</span>
                </button>
              </div>
            )}
            {receivedQuickComment && (
              <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Opponent note
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  {receivedQuickComment.from}: {receivedQuickComment.comment}
                </p>
              </div>
            )}
            <button onClick={handleCancel} disabled={cancelling} className="btn-danger mt-3 w-full text-sm">
              {cancelling ? 'Cancelling...' : 'Cancel Match'}
            </button>
          </div>
        )}

        {match.status === 'disputed' && (
          <div className="card mb-4 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-500" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Match Disputed</h3>
            </div>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Upload a screenshot of the result to help resolve the dispute.
            </p>
            {match.dispute_screenshot_url ? (
              <div className="mb-4">
                <div className="relative aspect-video overflow-hidden rounded-xl border border-[var(--border-color)]">
                  <Image
                    src={match.dispute_screenshot_url}
                    alt="Dispute screenshot"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="mt-2 text-center text-xs font-medium text-[var(--brand-teal)]">
                  Under review. Admin will resolve within 24 hours.
                </p>
              </div>
            ) : (
              <div
                className="mb-3 cursor-pointer rounded-xl border-2 border-dashed border-[var(--border-color)] p-6 text-center transition-colors hover:border-[rgba(255,107,107,0.28)]"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={24} className="mx-auto mb-2 text-[var(--text-soft)]" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Click to upload screenshot
                </p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              className="hidden"
            />
            {!match.dispute_screenshot_url && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingScreenshot}
                className="btn-primary w-full"
              >
                <Upload size={14} /> {uploadingScreenshot ? 'Uploading...' : 'Upload Screenshot'}
              </button>
            )}
          </div>
        )}

        {match.status === 'completed' && (
          <div
            className={`card result-panel mb-4 overflow-hidden p-6 text-center ${
              iWon ? 'result-panel-win' : 'result-panel-loss'
            }`}
          >
            <div className={`result-burst ${iWon ? 'result-burst-win' : 'result-burst-loss'}`} />
            <div className="relative">
              <div className={`result-emblem ${iWon ? 'result-emblem-win' : 'result-emblem-loss'}`}>
                {iWon ? <Trophy size={30} /> : <X size={30} />}
              </div>
              <h3 className="mb-1 text-2xl font-black text-[var(--text-primary)]">
                {resultHeading}
              </h3>
              <p className="mx-auto max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                {resultCopy}
              </p>
            </div>
            {gamificationResult && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="brand-chip px-2.5 py-1">+{gamificationResult.xpEarned} XP</span>
                <span className="brand-chip-coral px-2.5 py-1">+{gamificationResult.mpEarned} MP</span>
                <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]">
                  Lv. {gamificationResult.newLevel}
                </span>
                <span className="rounded-full border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.14)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-secondary-text)]">
                  Streak {gamificationResult.newStreak}
                </span>
                {gamificationResult.leveledUp && (
                  <span className="rounded-full border border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.14)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-coral)]">
                    Level up
                  </span>
                )}
              </div>
            )}
            {match.winner_id && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Winner:{' '}
                <strong className="text-[var(--text-primary)]">
                  {match.winner_id === user.id ? 'You' : opponent.username}
                </strong>
              </p>
            )}
            {gamificationResult?.newAchievements?.length ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {gamificationResult.newAchievements.map((achievement) => (
                  <span
                    key={achievement.key}
                    className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                  >
                    {achievement.emoji} {achievement.title}
                  </span>
                ))}
              </div>
            ) : null}
            {sentQuickComment && (
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                Your note: <span className="font-semibold text-[var(--text-primary)]">{sentQuickComment}</span>
              </p>
            )}
            {receivedQuickComment && (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {receivedQuickComment.from} said:{' '}
                <span className="font-semibold text-[var(--text-primary)]">{receivedQuickComment.comment}</span>
              </p>
            )}
            {!keepResultOpen && autoCloseCountdown !== null && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Closing match in {autoCloseCountdown}s
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="btn-primary">
                Back to dashboard
              </button>
              {!keepResultOpen && autoCloseCountdown !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setKeepResultOpen(true);
                    setAutoCloseCountdown(null);
                  }}
                  className="btn-outline"
                >
                  Keep result open
                </button>
              )}
            </div>
          </div>
        )}

        <div className="card p-5">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-soft)]">
            Match Info
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="mb-1 text-xs text-[var(--text-soft)]">Your Rank</p>
              <RatingBadge
                rating={
                  ((user as unknown as Record<string, unknown>)[`rating_${match.game}`] as number) ??
                  1000
                }
                size="sm"
              />
            </div>
            <div className="text-center">
              <p className="mb-1 text-xs text-[var(--text-soft)]">Game Mode</p>
              <span className="brand-chip justify-center">{game?.mode}</span>
            </div>
          </div>
          {gamificationResult && (
            <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">
              Match payout: {gamificationResult.xpEarned} XP / {gamificationResult.mpEarned} MP
            </p>
          )}
          <p className="mt-3 text-center text-xs text-[var(--text-soft)]">
            Started {new Date(match.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
