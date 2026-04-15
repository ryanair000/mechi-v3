'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, Copy, Swords, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { ShareMenu } from '@/components/ShareMenu';
import { useAuthFetch } from '@/components/AuthProvider';
import { getRoundLabel } from '@/lib/bracket';
import { GAMES, PLATFORMS } from '@/lib/config';
import {
  getTournamentOgImageUrl,
  getTournamentShareUrl,
  tournamentShareText,
} from '@/lib/share';
import type { GameKey, Tournament, TournamentMatch, TournamentPlayer } from '@/types';

type TournamentDetail = Tournament & {
  confirmed_count: number;
  slots_left: number;
};

type ViewerState = {
  joined: boolean;
  isOrganizer: boolean;
  paymentStatus: string | null;
};

type DetailResponse = {
  tournament: TournamentDetail;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  viewer: ViewerState;
};

export default function TournamentDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const paymentVerifiedRef = useRef<string | null>(null);
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);

  const fetchTournament = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/tournaments/${slug}`);
      const payload = await res.json();
      if (!res.ok) {
        toast.error(payload.error ?? 'Tournament not found');
        router.push('/tournaments');
        return;
      }
      setData(payload);
    } catch {
      toast.error('Could not load tournament');
    } finally {
      setLoading(false);
    }
  }, [authFetch, router, slug]);

  useEffect(() => {
    void fetchTournament();
  }, [fetchTournament]);

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference || paymentVerifiedRef.current === reference) return;

    paymentVerifiedRef.current = reference;
    async function verifyPayment() {
      const res = await authFetch(`/api/tournaments/${slug}/verify-payment`, {
        method: 'POST',
        body: JSON.stringify({ reference }),
      });
      const payload = await res.json();
      if (res.ok) {
        toast.success('Payment confirmed. You are in.');
        router.replace(`/t/${slug}`);
        void fetchTournament();
      } else {
        toast.error(payload.error ?? 'Payment not confirmed yet');
      }
    }

    void verifyPayment();
  }, [authFetch, fetchTournament, router, searchParams, slug]);

  const rounds = useMemo(() => {
    const map = new Map<number, TournamentMatch[]>();
    for (const match of data?.matches ?? []) {
      map.set(match.round, [...(map.get(match.round) ?? []), match]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [data?.matches]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await authFetch(`/api/tournaments/${slug}/join`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) {
        toast.error(payload.error ?? 'Could not join tournament');
        return;
      }
      if (payload.authorization_url) {
        window.location.href = payload.authorization_url;
        return;
      }
      toast.success('You joined the bracket');
      await fetchTournament();
    } catch {
      toast.error('Could not join tournament');
    } finally {
      setJoining(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await authFetch(`/api/tournaments/${slug}/start`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) {
        toast.error(payload.error ?? 'Could not start tournament');
        return;
      }
      toast.success('Bracket started');
      await fetchTournament();
    } catch {
      toast.error('Could not start tournament');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="h-44 shimmer" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-48 shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { tournament, viewer, players } = data;
  const game = GAMES[tournament.game as GameKey];
  const totalRounds = Math.log2(tournament.size);
  const shareText = tournamentShareText(
    tournament.title,
    game?.label ?? tournament.game,
    tournament.entry_fee,
    tournament.slots_left
  );

  return (
    <div className="page-container">
      <button onClick={() => router.back()} className="brand-link mb-5 inline-flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="card circuit-panel mb-5 overflow-hidden">
        <div className="border-b border-[var(--border-color)] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="brand-kicker">{game?.label ?? tournament.game}</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-normal text-[var(--text-primary)] sm:text-4xl">
                {tournament.title}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[var(--text-secondary)]">
                <span className="brand-chip px-3 py-1">{tournament.status}</span>
                <span className="rounded-full border border-[var(--border-color)] px-3 py-1">
                  {PLATFORMS[tournament.platform ?? 'ps']?.label ?? tournament.platform}
                </span>
                <span className="rounded-full border border-[var(--border-color)] px-3 py-1">
                  {tournament.region}
                </span>
              </div>
            </div>

            <ShareMenu
              variant="primary"
              title={tournament.title}
              text={shareText}
              url={getTournamentShareUrl(tournament.slug)}
              imageUrl={getTournamentOgImageUrl(tournament.slug)}
              imageFilename={`${tournament.slug}-mechi.png`}
            />
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-4 sm:p-6">
          <StatCard icon={<Users size={15} />} label="Players" value={`${tournament.confirmed_count}/${tournament.size}`} />
          <StatCard icon={<Swords size={15} />} label="Entry" value={tournament.entry_fee > 0 ? `KES ${tournament.entry_fee}` : 'Free'} />
          <StatCard icon={<Trophy size={15} />} label="Prize" value={tournament.prize_pool > 0 ? `KES ${tournament.prize_pool}` : 'Glory'} />
          <StatCard icon={<Clock size={15} />} label="Slots left" value={String(tournament.slots_left)} />
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        {!viewer.joined && tournament.status === 'open' && (
          <button onClick={handleJoin} disabled={joining} className="btn-primary flex-1">
            {joining
              ? 'Joining...'
              : tournament.entry_fee > 0
                ? `Join for KES ${tournament.entry_fee}`
                : 'Join Free'}
          </button>
        )}
        {viewer.joined && (
          <div className="surface-live flex flex-1 items-center gap-2 rounded-2xl p-4 text-sm font-bold text-[var(--accent-secondary-text)]">
            <CheckCircle2 size={16} />
            You are in this bracket{viewer.paymentStatus ? ` / ${viewer.paymentStatus}` : ''}.
          </div>
        )}
        {viewer.isOrganizer && tournament.status === 'full' && (
          <button onClick={handleStart} disabled={starting} className="btn-primary flex-1">
            {starting ? 'Starting...' : 'Start Tournament'}
          </button>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="brand-kicker">Live Bracket</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Match path</h2>
            </div>
          </div>

          {rounds.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-8 text-center text-sm text-[var(--text-soft)]">
              Bracket appears after the organizer starts the tournament.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {rounds.map(([round, matches]) => (
                <div key={round} className="space-y-3">
                  <p className="section-title">{getRoundLabel(round, totalRounds)}</p>
                  {matches.map((match) => (
                    <div key={match.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-3">
                      <PlayerLine name={match.player1?.username ?? 'TBD'} won={match.winner_id === match.player1_id} />
                      <div className="my-2 border-t border-[var(--border-color)]" />
                      <PlayerLine name={match.player2?.username ?? 'TBD'} won={match.winner_id === match.player2_id} />
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                          {match.status}
                        </span>
                        {match.match_id && match.status !== 'completed' && (
                          <Link href={`/match/${match.match_id}`} className="brand-link text-xs font-black">
                            Open match
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <p className="section-title">Players</p>
            <div className="mt-4 space-y-2">
              {players.map((player, index) => (
                <div key={player.id} className="flex items-center gap-3 rounded-2xl bg-[var(--surface-strong)] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(50,224,196,0.12)] text-xs font-black text-[var(--brand-teal)]">
                    {player.seed ?? index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[var(--text-primary)]">
                      {player.user?.username ?? 'Player'}
                    </p>
                    <p className="text-xs text-[var(--text-soft)]">{player.payment_status}</p>
                  </div>
                </div>
              ))}
              {Array.from({ length: tournament.size - players.length }).map((_, index) => (
                <div key={`empty-${index}`} className="rounded-2xl border border-dashed border-[var(--border-color)] p-3 text-sm text-[var(--text-soft)]">
                  Open slot
                </div>
              ))}
            </div>
          </section>

          {tournament.rules && (
            <section className="card p-5">
              <p className="section-title">Rules</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                {tournament.rules}
              </p>
            </section>
          )}

          <button
            onClick={() => {
              navigator.clipboard.writeText(getTournamentShareUrl(tournament.slug));
              toast.success('Tournament link copied');
            }}
            className="btn-ghost w-full"
          >
            <Copy size={14} /> Copy share link
          </button>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
      <div className="mb-2 text-[var(--brand-teal)]">{icon}</div>
      <p className="text-lg font-black text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
    </div>
  );
}

function PlayerLine({ name, won }: { name: string; won: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`truncate text-sm font-bold ${won ? 'text-[var(--brand-teal)]' : 'text-[var(--text-primary)]'}`}>
        {name}
      </span>
      {won && <Trophy size={13} className="text-[var(--brand-coral)]" />}
    </div>
  );
}
