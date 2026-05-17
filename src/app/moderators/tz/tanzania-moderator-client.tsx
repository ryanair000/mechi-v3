'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import {
  TZ_TOURNAMENT,
  formatTanzaniaPaymentStatus,
  type TanzaniaTournamentPaymentStatus,
  type TanzaniaTournamentRegistration,
} from '@/lib/tanzania-tournament';

const API_PATH = '/api/moderators/tz-registrations';

type Draft = {
  payment_status: TanzaniaTournamentPaymentStatus;
  payment_reference: string;
  payment_note: string;
  admin_note: string;
};

function buildDrafts(registrations: TanzaniaTournamentRegistration[]) {
  return registrations.reduce<Record<string, Draft>>((drafts, registration) => {
    drafts[registration.id] = {
      payment_status: registration.payment_status,
      payment_reference: registration.payment_reference ?? '',
      payment_note: registration.payment_note ?? '',
      admin_note: registration.admin_note ?? '',
    };
    return drafts;
  }, {});
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Haijathibitishwa';

  try {
    return new Date(value).toLocaleString('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Nairobi',
    });
  } catch {
    return value;
  }
}

function getPlayerWhatsappUrl(registration: TanzaniaTournamentRegistration) {
  const rawNumber = registration.whatsapp_number ?? registration.phone;
  const digits = rawNumber.replace(/[^\d]/g, '');
  const whatsappNumber = digits.startsWith('0') ? `255${digits.slice(1)}` : digits;
  const message = `Habari ${registration.full_name}, tunawasiliana kuhusu usajili wako wa ${TZ_TOURNAMENT.swahiliTitle}.`;

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
function getStatusClassName(status: TanzaniaTournamentPaymentStatus) {
  switch (status) {
    case 'paid':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]';
    case 'manual_review':
      return 'bg-sky-500/14 text-sky-300';
    case 'rejected':
      return 'bg-red-500/14 text-red-300';
    case 'pending_payment':
    default:
      return 'bg-amber-500/14 text-amber-300';
  }
}

export function TanzaniaModeratorClient() {
  const authFetch = useAuthFetch();
  const [registrations, setRegistrations] = useState<TanzaniaTournamentRegistration[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(API_PATH);
      const payload = (await response.json()) as {
        registrations?: TanzaniaTournamentRegistration[];
        error?: string;
      };

      if (!response.ok) {
        toast.error(payload.error ?? 'Could not load Tanzania registrations');
        setRegistrations([]);
        return;
      }

      const nextRegistrations = payload.registrations ?? [];
      setRegistrations(nextRegistrations);
      setDrafts(buildDrafts(nextRegistrations));
    } catch {
      toast.error('Network error while loading registrations');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void fetchRegistrations();
  }, [fetchRegistrations]);

  const summary = useMemo(
    () => ({
      total: registrations.length,
      paid: registrations.filter((registration) => registration.payment_status === 'paid').length,
      pending: registrations.filter((registration) => registration.payment_status === 'pending_payment').length,
      review: registrations.filter((registration) => registration.payment_status === 'manual_review').length,
    }),
    [registrations]
  );

  const filteredRegistrations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return registrations;

    return registrations.filter((registration) =>
      [
        registration.full_name,
        registration.phone,
        registration.whatsapp_number,
        registration.email,
        registration.in_game_username,
        registration.konami_id,
        registration.city,
        registration.payment_reference,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [query, registrations]);

  async function handleUpdate(
    registration: TanzaniaTournamentRegistration,
    updates: Partial<Draft>
  ) {
    setActingOn(registration.id);
    try {
      const draft = drafts[registration.id];
      const response = await authFetch(API_PATH, {
        method: 'PATCH',
        body: JSON.stringify({
          registration_id: registration.id,
          payment_status: updates.payment_status ?? draft?.payment_status,
          payment_reference: updates.payment_reference ?? draft?.payment_reference,
          payment_note: updates.payment_note ?? draft?.payment_note,
          admin_note: updates.admin_note ?? draft?.admin_note,
        }),
      });
      const payload = (await response.json()) as {
        registrations?: TanzaniaTournamentRegistration[];
        error?: string;
      };

      if (!response.ok) {
        toast.error(payload.error ?? 'Could not update registration');
        return;
      }

      const nextRegistrations = payload.registrations ?? registrations;
      setRegistrations(nextRegistrations);
      setDrafts(buildDrafts(nextRegistrations));
      toast.success('Registration updated');
    } catch {
      toast.error('Network error while updating registration');
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="brand-kicker">Days Esports Tanzania</p>
            <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">
              eFootball Mobile registrations
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Confirm Airtel Money payments after the player sends their transaction screenshot to
              WhatsApp {TZ_TOURNAMENT.supportNumber}. No screenshot upload exists on the website.
            </p>
          </div>
          <button type="button" onClick={() => void fetchRegistrations()} className="btn-ghost">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Registered', value: summary.total, icon: ShieldAlert },
            { label: 'Paid', value: summary.paid, icon: CheckCircle2 },
            { label: 'Pending', value: summary.pending, icon: Loader2 },
            { label: 'Review', value: summary.review, icon: Search },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4">
                <div className="flex items-center gap-2 text-[var(--text-soft)]">
                  <Icon size={15} />
                  <p className="text-xs font-bold">{item.label}</p>
                </div>
                <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  {item.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-title">Players</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
              Payment confirmation desk
            </h2>
          </div>
          <label className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-9"
              placeholder="Search player, phone, username..."
            />
          </label>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="h-52 shimmer rounded-lg" />
            <div className="h-52 shimmer rounded-lg" />
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <p className="mt-5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-5 text-sm text-[var(--text-secondary)]">
            No Tanzania registrations found.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {filteredRegistrations.map((registration) => {
              const draft = drafts[registration.id] ?? {
                payment_status: registration.payment_status,
                payment_reference: '',
                payment_note: '',
                admin_note: '',
              };
              const isActing = actingOn === registration.id;

              return (
                <article key={registration.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-[var(--text-primary)]">
                        {registration.in_game_username}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {registration.full_name} | {registration.phone}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        Registered {formatDate(registration.created_at)}
                      </p>
                    </div>
                    <span className={`inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-black ${getStatusClassName(registration.payment_status)}`}>
                      {formatTanzaniaPaymentStatus(registration.payment_status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-3 text-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">WhatsApp</p>
                      <p className="mt-1 font-bold text-[var(--text-primary)]">{registration.whatsapp_number ?? registration.phone}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-3 py-3 text-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">Konami ID</p>
                      <p className="mt-1 font-bold text-[var(--text-primary)]">{registration.konami_id || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <select
                      value={draft.payment_status}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [registration.id]: {
                            ...draft,
                            payment_status: event.target.value as TanzaniaTournamentPaymentStatus,
                          },
                        }))
                      }
                      className="input"
                    >
                      <option value="pending_payment">Pending payment</option>
                      <option value="manual_review">Manual review</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <input
                      value={draft.payment_reference}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [registration.id]: { ...draft, payment_reference: event.target.value },
                        }))
                      }
                      className="input"
                      placeholder="Airtel transaction reference"
                    />
                    <textarea
                      value={draft.payment_note}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [registration.id]: { ...draft, payment_note: event.target.value },
                        }))
                      }
                      className="input min-h-20 resize-y"
                      placeholder="Payment note"
                    />
                    <textarea
                      value={draft.admin_note}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [registration.id]: { ...draft, admin_note: event.target.value },
                        }))
                      }
                      className="input min-h-20 resize-y"
                      placeholder="Admin note"
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => void handleUpdate(registration, draft)}
                      className="btn-primary justify-center"
                    >
                      {isActing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => void handleUpdate(registration, { ...draft, payment_status: 'paid' })}
                      className="btn-ghost justify-center"
                    >
                      <CheckCircle2 size={14} />
                      Mark paid
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => void handleUpdate(registration, { ...draft, payment_status: 'rejected' })}
                      className="btn-ghost justify-center"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>

                  <a
                    href={getPlayerWhatsappUrl(registration)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost mt-3 w-full justify-center"
                  >
                    <MessageCircle size={14} />
                    Message player
                  </a>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
