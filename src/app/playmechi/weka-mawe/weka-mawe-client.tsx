'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Gamepad2, Trophy, Video, WalletCards } from 'lucide-react';
import FooterSection from '@/components/footer';
import { useAuthFetch } from '@/components/AuthProvider';
import { PlayMechiHomeHeader } from '@/app/home/playmechi-home-header';
import {
  WEKA_MAWE_BRACKET_PATH,
  WEKA_MAWE_CHECK_IN_PATH,
  WEKA_MAWE_GAME_LABEL,
  WEKA_MAWE_REGISTER_PATH,
  WEKA_MAWE_TITLE,
  formatEatDateTime,
  isWekaMaweCheckInOpen,
  isWekaMaweRegistrationOpen,
  type WekaMaweSummary,
} from '@/lib/weka-mawe-shared';

type Mode = 'landing' | 'register' | 'check-in' | 'bracket';

const API_PATH =
  '/api/weka-mawe/current-edition';
const REGISTER_API_PATH = '/api/weka-mawe/register';
const CHECK_IN_API_PATH = '/api/weka-mawe/check-in';

function initialSummary(): WekaMaweSummary {
  return {
    edition: null,
    registrations: [],
    checkIns: [],
    matches: [],
    totals: { registered: 0, paid: 0, pendingPayment: 0, checkedIn: 0, slotsLeft: 0 },
    userRegistration: null,
    userCheckIn: null,
  };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-4">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

export function WekaMaweClient({ mode }: { mode: Mode }) {
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<WekaMaweSummary>(initialSummary);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [ign, setIgn] = useState('');
  const [phone, setPhone] = useState('');
  const edition = summary.edition;

  const load = async () => {
    setLoading(true);
    try {
      const endpoint =
        mode === 'register' ? REGISTER_API_PATH : mode === 'check-in' ? CHECK_IN_API_PATH : API_PATH;
      const response = await authFetch(endpoint);
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
  }, [mode]);

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference || mode !== 'register') return;

    void (async () => {
      setSubmitting(true);
      try {
        const response = await authFetch(REGISTER_API_PATH, {
          method: 'POST',
          body: JSON.stringify({ action: 'verify_payment', reference }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? 'Payment is not confirmed yet.');
        setSummary(payload);
        setMessage('Payment confirmed. Your Weka Mawe slot is locked.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Payment is not confirmed yet.');
      } finally {
        setSubmitting(false);
      }
    })();
  }, [authFetch, mode, searchParams]);

  const groupedMatches = useMemo(
    () =>
      summary.matches.reduce<Record<string, WekaMaweSummary['matches']>>((groups, match) => {
        groups[match.round_key] = groups[match.round_key] ?? [];
        groups[match.round_key].push(match);
        return groups;
      }, {}),
    [summary.matches]
  );

  const register = async () => {
    setSubmitting(true);
    setMessage('');
    try {
      const response = await authFetch(REGISTER_API_PATH, {
        method: 'POST',
        body: JSON.stringify({ ign, phone, whatsappNumber: phone }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not register.');
      if (payload.authorizationUrl) {
        window.location.href = payload.authorizationUrl;
        return;
      }
      setMessage('Registration submitted.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not register.');
    } finally {
      setSubmitting(false);
    }
  };

  const checkIn = async () => {
    setSubmitting(true);
    setMessage('');
    try {
      const response = await authFetch(CHECK_IN_API_PATH, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not check in.');
      setSummary(payload);
      setMessage('Checked in. You are bracket-ready.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not check in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-base marketing-prototype-shell min-h-screen">
      <PlayMechiHomeHeader />
      <main className="landing-shell py-12 md:py-16">
        <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <p className="section-title">PlayMechi weekly bracket</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-[var(--text-primary)] md:text-6xl">
              {WEKA_MAWE_TITLE}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
              Weekly {WEKA_MAWE_GAME_LABEL} pressure on Mechi.club. Register, pay, check in,
              then play a 32-player single-elimination bracket run by PlayMechi admin.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={WEKA_MAWE_REGISTER_PATH} className="btn-primary">
                Register for KSh {edition?.registration_fee_kes ?? 100}
              </Link>
              <Link href={WEKA_MAWE_CHECK_IN_PATH} className="btn-outline">
                Check In
              </Link>
              <Link href={WEKA_MAWE_BRACKET_PATH} className="btn-ghost">
                View Bracket
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
            <div className="flex items-center gap-3 text-[var(--accent-secondary-text)]">
              <Trophy size={20} />
              <p className="font-black uppercase tracking-[0.12em]">Current edition</p>
            </div>
            <h2 className="mt-4 text-2xl font-black text-[var(--text-primary)]">
              {edition?.title ?? 'Weka Mawe edition loading'}
            </h2>
            <div className="mt-4 space-y-3 text-sm font-semibold text-[var(--text-secondary)]">
              <p className="flex items-center gap-2">
                <Clock3 size={16} /> {formatEatDateTime(edition?.starts_at)}
              </p>
              <p className="flex items-center gap-2">
                <Gamepad2 size={16} /> {WEKA_MAWE_GAME_LABEL}
              </p>
              <p className="flex items-center gap-2">
                <WalletCards size={16} /> KSh {edition?.registration_fee_kes ?? 100} entry
              </p>
              <p className="flex items-center gap-2">
                <Video size={16} /> Quarter-finals onward recorded
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Paid players" value={`${summary.totals.paid}/${edition?.max_players ?? 32}`} />
          <StatCard label="Slots left" value={summary.totals.slotsLeft} />
          <StatCard label="Pending payment" value={summary.totals.pendingPayment} />
          <StatCard label="Checked in" value={summary.totals.checkedIn} />
        </section>

        {message ? (
          <div className="mt-6 rounded-lg border border-[rgba(50,224,196,0.25)] bg-[rgba(50,224,196,0.08)] p-4 text-sm font-semibold text-[var(--text-primary)]">
            {message}
          </div>
        ) : null}

        {mode === 'register' ? (
          <section className="mt-10 max-w-2xl rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Register</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {isWekaMaweRegistrationOpen(edition)
                ? 'Enter the exact eFootball name you will use on match day.'
                : 'Registration is not open right now.'}
            </p>
            {summary.userRegistration ? (
              <div className="mt-5 rounded-lg border border-[var(--border-color)] p-4">
                <p className="font-black text-[var(--text-primary)]">
                  Registered as {summary.userRegistration.ign}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Payment: {summary.userRegistration.payment_status}
                </p>
                {summary.userRegistration.payment_authorization_url &&
                summary.userRegistration.payment_status !== 'paid' ? (
                  <a href={summary.userRegistration.payment_authorization_url} className="btn-primary mt-4">
                    Complete Payment
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <input
                  value={ign}
                  onChange={(event) => setIgn(event.target.value)}
                  placeholder="eFootball IGN"
                  className="form-input"
                />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="WhatsApp / contact number"
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={register}
                  disabled={submitting || loading || !isWekaMaweRegistrationOpen(edition)}
                  className="btn-primary w-fit"
                >
                  {submitting ? 'Starting payment...' : `Register for KSh ${edition?.registration_fee_kes ?? 100}`}
                </button>
              </div>
            )}
          </section>
        ) : null}

        {mode === 'check-in' ? (
          <section className="mt-10 max-w-2xl rounded-lg border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Website Check-In</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Only paid players who check in before the deadline are bracket-ready.
            </p>
            <div className="mt-5 rounded-lg border border-[var(--border-color)] p-4">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                Registration: {summary.userRegistration?.payment_status ?? 'not registered'}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
                Check-in: {summary.userCheckIn?.status ?? 'not checked in'}
              </p>
              {summary.userCheckIn ? (
                <p className="mt-4 flex items-center gap-2 font-black text-[var(--accent-secondary-text)]">
                  <CheckCircle2 size={18} /> You are checked in.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={checkIn}
                  disabled={submitting || loading || !isWekaMaweCheckInOpen(edition)}
                  className="btn-primary mt-4"
                >
                  {submitting ? 'Checking in...' : 'Check In Now'}
                </button>
              )}
            </div>
          </section>
        ) : null}

        {(mode === 'bracket' || mode === 'landing') && summary.matches.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Bracket</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-5">
              {Object.entries(groupedMatches).map(([round, matches]) => (
                <div key={round} className="rounded-lg border border-[var(--border-color)] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    {round.replace(/_/g, ' ')}
                  </p>
                  <div className="mt-3 space-y-2">
                    {matches.map((match) => (
                      <div key={match.id} className="rounded-md bg-white/[0.03] p-3 text-xs">
                        <p className="font-bold text-[var(--text-primary)]">
                          {match.player_one?.username ?? 'TBD'} vs {match.player_two?.username ?? 'TBD'}
                        </p>
                        <p className="mt-1 text-[var(--text-secondary)]">
                          {match.status}
                          {match.recording_expected ? ` · recording ${match.recording_status}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {mode === 'landing' ? (
          <section className="mt-12 grid gap-4 md:grid-cols-4">
            {['Register on Mechi.club', 'Check in on the website', 'Admin publishes bracket', 'Record QF to final'].map(
              (step, index) => (
                <div key={step} className="rounded-lg border border-[var(--border-color)] p-4">
                  <p className="text-sm font-black text-[var(--accent-secondary-text)]">0{index + 1}</p>
                  <p className="mt-2 font-black text-[var(--text-primary)]">{step}</p>
                </div>
              )
            )}
          </section>
        ) : null}
      </main>
      <FooterSection className="!pt-6 md:!pt-10" />
    </div>
  );
}
