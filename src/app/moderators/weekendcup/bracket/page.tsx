'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, RefreshCw, Shuffle, Trophy, CheckCircle2 } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { WEEKEND_CUP_ROUND_LABELS, type WeekendCupBracketMatch } from '@/lib/weekend-cup-match-day';

type RegistrationInfo = {
  id: string;
  in_game_username: string;
  user?: { username: string } | null;
};

export default function WeekendCupBracketPage() {
  const authFetch = useAuthFetch();
  const [matches, setMatches] = useState<WeekendCupBracketMatch[]>([]);
  const [registrations, setRegistrations] = useState<Map<string, RegistrationInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<{ p1: string; p2: string }>({ p1: '', p2: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bracketRes, regRes] = await Promise.all([
        authFetch('/api/moderators/weekendcup/bracket'),
        authFetch('/api/moderators/weekendcup-registrations?game=efootball'),
      ]);

      const bracketData = await bracketRes.json();
      const regData = await regRes.json();

      if (!bracketRes.ok) {
        toast.error(bracketData.error ?? 'Could not load bracket');
        return;
      }

      setMatches((bracketData.matches ?? []) as WeekendCupBracketMatch[]);

      const regMap = new Map<string, RegistrationInfo>();
      for (const reg of (regData.registrations ?? []) as RegistrationInfo[]) {
        regMap.set(reg.id, reg);
      }
      setRegistrations(regMap);
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const generateBracket = async () => {
    if (!window.confirm('Generate a new bracket? This will replace any existing bracket.')) return;

    setGenerating(true);
    try {
      const res = await authFetch('/api/moderators/weekendcup/bracket', {
        method: 'POST',
        body: JSON.stringify({ shuffle: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not generate bracket');
        return;
      }
      toast.success(`Bracket generated with ${data.playerCount} players`);
      setMatches((data.matches ?? []) as WeekendCupBracketMatch[]);
    } catch {
      toast.error('Network error');
    } finally {
      setGenerating(false);
    }
  };

  const startEditMatch = (match: WeekendCupBracketMatch) => {
    setEditingMatch(match.id);
    setEditScores({
      p1: match.player1_score?.toString() ?? '',
      p2: match.player2_score?.toString() ?? '',
    });
  };

  const saveMatchResult = async (matchId: string) => {
    setActingId(matchId);
    try {
      const res = await authFetch('/api/moderators/weekendcup/bracket', {
        method: 'PATCH',
        body: JSON.stringify({
          match_id: matchId,
          player1_score: editScores.p1 ? parseInt(editScores.p1, 10) : null,
          player2_score: editScores.p2 ? parseInt(editScores.p2, 10) : null,
          status: 'completed',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not save result');
        return;
      }
      toast.success('Match result saved');
      setMatches((data.matches ?? []) as WeekendCupBracketMatch[]);
      setEditingMatch(null);
    } catch {
      toast.error('Network error');
    } finally {
      setActingId(null);
    }
  };

  const markWalkover = async (matchId: string) => {
    setActingId(matchId);
    try {
      const res = await authFetch('/api/moderators/weekendcup/bracket', {
        method: 'PATCH',
        body: JSON.stringify({ match_id: matchId, status: 'walkover' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not mark walkover');
        return;
      }
      toast.success('Walkover recorded');
      setMatches((data.matches ?? []) as WeekendCupBracketMatch[]);
    } catch {
      toast.error('Network error');
    } finally {
      setActingId(null);
    }
  };

  const getPlayerName = (regId: string | null) => {
    if (!regId) return 'TBD';
    const reg = registrations.get(regId);
    return reg?.in_game_username ?? 'Unknown';
  };

  const roundGroups = matches.reduce<Record<number, WeekendCupBracketMatch[]>>((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {});

  return (
    <main className="page-base app-prototype-shell min-h-screen p-4 sm:p-6" data-theme="dark">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-title">Weekend Cup</p>
              <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                eFootball Bracket
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                32-player knockout with bronze match. Winners auto-advance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void loadData()} className="btn-ghost" disabled={loading}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button type="button" onClick={() => void generateBracket()} className="btn-primary" disabled={generating}>
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
                Generate bracket
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="card flex items-center gap-2 p-6 text-sm text-[var(--text-secondary)]">
            <Loader2 size={16} className="animate-spin" />
            Loading bracket...
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-6 text-center">
            <Trophy size={48} className="mx-auto text-[var(--text-soft)]" />
            <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">No bracket yet</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Generate a bracket once players have checked in.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(roundGroups)
              .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
              .map(([round, roundMatches]) => (
                <section key={round} className="card p-0">
                  <div className="border-b border-[var(--border-color)] p-4">
                    <h2 className="text-lg font-black text-[var(--text-primary)]">
                      {WEEKEND_CUP_ROUND_LABELS[parseInt(round, 10)] ?? `Round ${round}`}
                    </h2>
                  </div>
                  <div className="divide-y divide-[var(--border-color)]">
                    {roundMatches.map((match) => {
                      const isEditing = editingMatch === match.id;
                      const canEdit = match.player1_registration_id && match.player2_registration_id && match.status !== 'completed';
                      const needsWalkover = (match.player1_registration_id && !match.player2_registration_id) ||
                        (!match.player1_registration_id && match.player2_registration_id);

                      return (
                        <div key={match.id} className="p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1">
                              <div className="text-sm text-[var(--text-soft)]">Match {match.match_number}</div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`font-bold ${match.winner_registration_id === match.player1_registration_id ? 'text-[var(--accent-secondary-text)]' : 'text-[var(--text-primary)]'}`}>
                                  {getPlayerName(match.player1_registration_id)}
                                </span>
                                {match.player1_score !== null && (
                                  <span className="rounded bg-[var(--surface-elevated)] px-2 py-0.5 text-sm font-bold">
                                    {match.player1_score}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`font-bold ${match.winner_registration_id === match.player2_registration_id ? 'text-[var(--accent-secondary-text)]' : 'text-[var(--text-primary)]'}`}>
                                  {getPlayerName(match.player2_registration_id)}
                                </span>
                                {match.player2_score !== null && (
                                  <span className="rounded bg-[var(--surface-elevated)] px-2 py-0.5 text-sm font-bold">
                                    {match.player2_score}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                                    match.status === 'completed'
                                      ? 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                                      : match.status === 'walkover'
                                        ? 'bg-amber-500/14 text-amber-300'
                                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  {match.status}
                                </span>
                              </div>
                            </div>

                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={editScores.p1}
                                  onChange={(e) => setEditScores((s) => ({ ...s, p1: e.target.value }))}
                                  placeholder="P1"
                                  className="input w-16"
                                />
                                <span className="text-[var(--text-soft)]">-</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={editScores.p2}
                                  onChange={(e) => setEditScores((s) => ({ ...s, p2: e.target.value }))}
                                  placeholder="P2"
                                  className="input w-16"
                                />
                                <button
                                  type="button"
                                  onClick={() => void saveMatchResult(match.id)}
                                  disabled={actingId === match.id}
                                  className="btn-primary"
                                >
                                  {actingId === match.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                  Save
                                </button>
                                <button type="button" onClick={() => setEditingMatch(null)} className="btn-ghost">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                {canEdit && (
                                  <button type="button" onClick={() => startEditMatch(match)} className="btn-ghost">
                                    Enter result
                                  </button>
                                )}
                                {needsWalkover && match.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => void markWalkover(match.id)}
                                    disabled={actingId === match.id}
                                    className="btn-ghost"
                                  >
                                    {actingId === match.id ? <Loader2 size={14} className="animate-spin" /> : null}
                                    Walkover
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>
        )}
      </div>
    </main>
  );
}
