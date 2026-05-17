'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Trophy, Video } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import {
  formatEatDateTime,
  type WekaMaweBracketMatch,
  type WekaMaweSummary,
} from '@/lib/weka-mawe-shared';

const API_PATH = '/api/admin/weka-mawe';

function emptySummary(): WekaMaweSummary {
  return {
    edition: null,
    registrations: [],
    checkIns: [],
    matches: [],
    totals: { registered: 0, paid: 0, pendingPayment: 0, checkedIn: 0, slotsLeft: 0 },
  };
}

export function WekaMaweAdminClient() {
  const authFetch = useAuthFetch();
  const [summary, setSummary] = useState<WekaMaweSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const groupedMatches = useMemo(
    () =>
      summary.matches.reduce<Record<string, WekaMaweBracketMatch[]>>((groups, match) => {
        groups[match.round_key] = groups[match.round_key] ?? [];
        groups[match.round_key].push(match);
        return groups;
      }, {}),
    [summary.matches]
  );

  const load = async () => {
    setLoading(true);
    try {
      const response = await authFetch(API_PATH);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not load Weka Mawe.');
      setSummary(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load Weka Mawe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAction = async (payload: Record<string, unknown>) => {
    setMessage('');
    const response = await authFetch(API_PATH, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? 'Action failed.');
      return;
    }
    setSummary(data);
    setMessage('Updated.');
  };

  const updateScore = async (match: WekaMaweBracketMatch, formData: FormData) => {
    await runAction({
      action: 'update_match',
      matchId: match.id,
      playerOneScore: formData.get('playerOneScore'),
      playerTwoScore: formData.get('playerTwoScore'),
      recordingStatus: formData.get('recordingStatus'),
      recordingUrl: formData.get('recordingUrl'),
    });
  };

  const edition = summary.edition;

  return (
    <div className="space-y-6">
      <section className="admin-section-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">Weka Mawe control</p>
            <h1 className="mt-2 text-3xl font-black text-[var(--text-primary)]">
              {edition?.title ?? 'Weka Mawe'}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {edition ? formatEatDateTime(edition.starts_at) : 'No edition found'}
            </p>
          </div>
          <button type="button" onClick={load} className="btn-outline">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
        {message ? (
          <div className="mt-4 rounded-md border border-[var(--border-color)] p-3 text-sm font-semibold text-[var(--text-primary)]">
            {message}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {[
          ['Registered', summary.totals.registered],
          ['Paid', summary.totals.paid],
          ['Pending', summary.totals.pendingPayment],
          ['Checked in', summary.totals.checkedIn],
          ['Slots left', summary.totals.slotsLeft],
        ].map(([label, value]) => (
          <div key={label} className="admin-section-card p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </section>

      <section className="admin-section-card p-5">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--text-primary)]">
          <Trophy size={20} /> Edition controls
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {['registration_open', 'check_in_open', 'locked', 'live', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => runAction({ action: 'update_edition_status', status })}
              className="btn-ghost"
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
          <button
            type="button"
            onClick={() => runAction({ action: 'generate_bracket' })}
            className="btn-primary"
          >
            Generate bracket
          </button>
        </div>
      </section>

      <section className="admin-section-card p-5">
        <h2 className="text-xl font-black text-[var(--text-primary)]">Registrations</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--text-soft)]">
              <tr>
                <th className="py-2">Player</th>
                <th>IGN</th>
                <th>Payment</th>
                <th>Eligibility</th>
                <th>Check-in</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {summary.registrations.map((registration) => {
                const checkedIn = summary.checkIns.some(
                  (checkIn) => checkIn.registration_id === registration.id
                );
                return (
                  <tr key={registration.id} className="border-t border-[var(--border-color)]">
                    <td className="py-3 font-semibold text-[var(--text-primary)]">
                      {registration.user?.username ?? registration.user_id}
                    </td>
                    <td>{registration.ign}</td>
                    <td>{registration.payment_status}</td>
                    <td>{registration.eligibility_status}</td>
                    <td>{checkedIn ? 'checked in' : 'not checked in'}</td>
                    <td className="flex flex-wrap gap-2 py-2">
                      <button
                        type="button"
                        className="btn-ghost min-h-8 px-2 py-1 text-xs"
                        onClick={() =>
                          runAction({
                            action: 'update_registration',
                            registrationId: registration.id,
                            paymentStatus: 'paid',
                            eligibilityStatus: 'verified',
                          })
                        }
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="btn-ghost min-h-8 px-2 py-1 text-xs"
                        onClick={() =>
                          runAction({
                            action: 'update_registration',
                            registrationId: registration.id,
                            eligibilityStatus: 'disqualified',
                          })
                        }
                      >
                        DQ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section-card p-5">
        <h2 className="text-xl font-black text-[var(--text-primary)]">Bracket</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-5">
          {Object.entries(groupedMatches).map(([round, matches]) => (
            <div key={round} className="rounded-lg border border-[var(--border-color)] p-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                {round.replace(/_/g, ' ')}
              </p>
              <div className="mt-3 space-y-3">
                {matches.map((match) => (
                  <form
                    key={match.id}
                    action={(formData) => {
                      void updateScore(match, formData);
                    }}
                    className="rounded-md bg-white/[0.03] p-3"
                  >
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {match.player_one?.username ?? 'TBD'} vs {match.player_two?.username ?? 'TBD'}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        name="playerOneScore"
                        defaultValue={match.player_one_score ?? ''}
                        placeholder="P1"
                        className="form-input min-h-9 px-2 py-1 text-sm"
                      />
                      <input
                        name="playerTwoScore"
                        defaultValue={match.player_two_score ?? ''}
                        placeholder="P2"
                        className="form-input min-h-9 px-2 py-1 text-sm"
                      />
                    </div>
                    {match.recording_expected ? (
                      <div className="mt-2 grid gap-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
                          <Video size={13} /> Recording
                        </label>
                        <select
                          name="recordingStatus"
                          defaultValue={match.recording_status}
                          className="form-input min-h-9 px-2 py-1 text-sm"
                        >
                          {['expected', 'received', 'missing'].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <input
                          name="recordingUrl"
                          defaultValue={match.recording_url ?? ''}
                          placeholder="Recording URL"
                          className="form-input min-h-9 px-2 py-1 text-sm"
                        />
                      </div>
                    ) : (
                      <input type="hidden" name="recordingStatus" value={match.recording_status} />
                    )}
                    <button type="submit" className="btn-primary mt-2 min-h-8 px-2 py-1 text-xs">
                      Save
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading...</p> : null}
    </div>
  );
}
