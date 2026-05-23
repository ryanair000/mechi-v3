'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, Save, RefreshCw, Trophy } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { WEEKEND_CUP_GAMES, WEEKEND_CUP_SLUG, isWeekendCupGame } from '@/lib/weekend-cup';
import { WEEKEND_CUP_BR_SCORING, calculateBRMatchPoints } from '@/lib/weekend-cup-match-day';

type Registration = {
  id: string;
  user_id: string;
  in_game_username: string;
  game_uid: string | null;
  whatsapp_number: string | null;
  user?: { username: string } | null;
};

type ScoreEntry = {
  registration_id: string;
  kills: number;
  placement: number | null;
  total_points: number;
};

export default function WeekendCupScoresPage() {
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const gameParam = searchParams.get('game') ?? '';
  const game = isWeekendCupGame(gameParam) ? gameParam : 'pubgm';
  const gameConfig = WEEKEND_CUP_GAMES.find((g) => g.game === game);
  const scoring = game === 'mystery' ? WEEKEND_CUP_BR_SCORING.pubgm : WEEKEND_CUP_BR_SCORING[game];

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  const [matchNumber, setMatchNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [regRes, scoresRes] = await Promise.all([
        authFetch(`/api/moderators/weekendcup-registrations?game=${encodeURIComponent(game)}`),
        authFetch(`/api/moderators/weekendcup/scores?game=${encodeURIComponent(game)}&match_number=${matchNumber}`),
      ]);

      const regData = await regRes.json();
      const scoresData = await scoresRes.json();

      if (!regRes.ok) {
        toast.error(regData.error ?? 'Could not load registrations');
        return;
      }

      const checkedIn = ((regData.registrations ?? []) as Array<Registration & { check_in_status: string; payment_status: string }>)
        .filter((r) => r.check_in_status === 'checked_in' && r.payment_status === 'paid');

      setRegistrations(checkedIn);

      const existingScores = (scoresData.scores ?? []) as Array<{
        registration_id: string;
        kills: number;
        placement: number | null;
        total_points: number;
      }>;

      const scoreMap: Record<string, ScoreEntry> = {};
      for (const reg of checkedIn) {
        const existing = existingScores.find((s) => s.registration_id === reg.id);
        scoreMap[reg.id] = existing ?? {
          registration_id: reg.id,
          kills: 0,
          placement: null,
          total_points: 0,
        };
      }
      setScores(scoreMap);
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, game, matchNumber]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateScore = (registrationId: string, field: 'kills' | 'placement', value: string) => {
    const numValue = value === '' ? (field === 'placement' ? null : 0) : parseInt(value, 10);
    setScores((prev) => {
      const current = prev[registrationId] ?? { registration_id: registrationId, kills: 0, placement: null, total_points: 0 };
      const updated = { ...current, [field]: numValue };
      const points = calculateBRMatchPoints(
        game,
        updated.kills,
        updated.placement
      );
      updated.total_points = points.totalPoints;
      return { ...prev, [registrationId]: updated };
    });
  };

  const saveAllScores = async () => {
    setSaving(true);
    try {
      const scoresToSave = Object.values(scores).map((s) => ({
        registration_id: s.registration_id,
        match_number: matchNumber,
        kills: s.kills,
        placement: s.placement,
      }));

      const res = await authFetch('/api/moderators/weekendcup/scores', {
        method: 'PATCH',
        body: JSON.stringify({ scores: scoresToSave }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not save scores');
        return;
      }

      toast.success(`Saved ${data.count} scores`);
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = Object.values(scores).reduce((sum, s) => sum + s.total_points, 0);
  const totalKills = Object.values(scores).reduce((sum, s) => sum + s.kills, 0);

  return (
    <main className="page-base app-prototype-shell min-h-screen p-4 sm:p-6" data-theme="dark">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-title">Weekend Cup</p>
              <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                {gameConfig?.label ?? game} Scores
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Enter kills and placement for each player. Points auto-calculate.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void loadData()} className="btn-ghost" disabled={loading}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button type="button" onClick={() => void saveAllScores()} className="btn-primary" disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save all
              </button>
            </div>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="label">Match number</label>
              <select
                value={matchNumber}
                onChange={(e) => setMatchNumber(parseInt(e.target.value, 10))}
                className="input w-32"
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>Match {n}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-[var(--text-secondary)]">Players:</span>{' '}
                <span className="font-bold text-[var(--text-primary)]">{registrations.length}</span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Total kills:</span>{' '}
                <span className="font-bold text-[var(--text-primary)]">{totalKills}</span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Total points:</span>{' '}
                <span className="font-bold text-[var(--accent-secondary-text)]">{totalPoints}</span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--text-soft)]">
            Scoring: {scoring?.killPoints ?? 0} pts/kill · Placement: 1st={scoring?.placementPoints[1] ?? 0}, 2nd={scoring?.placementPoints[2] ?? 0}, 3rd={scoring?.placementPoints[3] ?? 0}...
          </p>
        </section>

        <section className="card p-0">
          <div className="border-b border-[var(--border-color)] p-4">
            <h2 className="flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
              <Trophy size={18} />
              Player scores
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-secondary)]">
              <Loader2 size={16} className="animate-spin" />
              Loading...
            </div>
          ) : registrations.length === 0 ? (
            <p className="p-6 text-sm text-[var(--text-secondary)]">No checked-in players found.</p>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {registrations.map((reg) => {
                const score = scores[reg.id] ?? { kills: 0, placement: null, total_points: 0 };
                return (
                  <div key={reg.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <div className="font-bold text-[var(--text-primary)]">{reg.in_game_username}</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {reg.user?.username ?? 'Unknown'} · {reg.game_uid ?? 'No UID'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="text-xs text-[var(--text-soft)]">Kills</label>
                        <input
                          type="number"
                          min="0"
                          value={score.kills}
                          onChange={(e) => updateScore(reg.id, 'kills', e.target.value)}
                          className="input w-20"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[var(--text-soft)]">Place</label>
                        <input
                          type="number"
                          min="1"
                          value={score.placement ?? ''}
                          onChange={(e) => updateScore(reg.id, 'placement', e.target.value)}
                          placeholder="#"
                          className="input w-20"
                        />
                      </div>
                      <div className="w-20 text-center">
                        <label className="text-xs text-[var(--text-soft)]">Points</label>
                        <div className="mt-2 text-lg font-black text-[var(--accent-secondary-text)]">
                          {score.total_points}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
