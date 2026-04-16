'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BellRing, ChevronRight, MessageCircle, Smartphone } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';

type NotificationProfile = {
  username?: string;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean;
};

const WHATSAPP_JOIN_URL = process.env.NEXT_PUBLIC_WHATSAPP_JOIN_URL ?? '';

export default function NotificationsPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<NotificationProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const res = await authFetch('/api/users/profile');
      if (!res.ok || cancelled) {
        return;
      }

      const data = await res.json();
      if (!cancelled) {
        setProfile(data.profile as NotificationProfile);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const whatsappNumber = profile?.whatsapp_number ?? user?.whatsapp_number ?? null;
  const whatsappEnabled = Boolean(
    profile?.whatsapp_notifications ?? user?.whatsapp_notifications ?? whatsappNumber
  );

  return (
    <div className="page-container">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Notifications</p>
            <h1 className="mt-3 text-[1.5rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Keep your alerts clean and easy to catch.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Queue moves, match rooms, and result reminders should land in one place without
              cluttering your dashboard.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.12)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
            <BellRing size={14} />
            {whatsappEnabled ? 'Alerts on' : 'Alerts off'}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                <MessageCircle size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-black text-[var(--text-primary)]">WhatsApp alerts</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {whatsappEnabled
                    ? 'You are set to catch queue and match updates without checking the dashboard every minute.'
                    : 'Turn this on if you want Mechi to ping you when your queue pops or a room is ready.'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Status
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                  {whatsappEnabled ? 'ON' : 'OFF'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Number
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                  {whatsappNumber || 'Not added yet'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/profile" className="btn-primary shadow-none">
                Manage in profile
                <ChevronRight size={15} />
              </Link>
              {WHATSAPP_JOIN_URL ? (
                <a href={WHATSAPP_JOIN_URL} target="_blank" rel="noreferrer" className="btn-ghost">
                  Open WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3">
            {[
              {
                title: 'Queue updates',
                copy: 'Get a heads-up when your ranked search turns into a live room.',
              },
              {
                title: 'Result reminders',
                copy: 'Stay on top of reports so matches close cleanly and your record stays sharp.',
              },
              {
                title: 'Account setup',
                copy: 'Use your profile when you want to change the number tied to alerts.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
                    <Smartphone size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
