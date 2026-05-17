'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, MessageCircle, Phone } from 'lucide-react';
import {
  TZ_TOURNAMENT,
  getTanzaniaTournamentCallUrl,
  getTanzaniaTournamentWhatsappUrl,
} from '@/lib/tanzania-tournament';

type SubmitState =
  | { status: 'idle'; message: string }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string };

export function TanzaniaRegistrationClient() {
  const [state, setState] = useState<SubmitState>({ status: 'idle', message: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setState({ status: 'idle', message: '' });

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch('/api/tz/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setState({
          status: 'error',
          message: payload.error ?? 'Usajili haujakamilika. Jaribu tena.',
        });
        return;
      }

      form.reset();
      setState({
        status: 'success',
        message:
          payload.message ??
          'Usajili umetumwa. Lipa kiingilio kisha tuma screenshot ya malipo WhatsApp.',
      });
    } catch {
      setState({
        status: 'error',
        message: 'Mtandao umeshindwa kutuma usajili. Jaribu tena.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-base min-h-screen bg-[#07111f] text-white" data-theme="dark">
      <section className="border-b border-white/10 bg-[#0b1524] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/tz" className="btn-ghost min-h-10 px-3 py-2 text-sm">
            <ArrowLeft size={15} />
            Rudi
          </Link>
          <p className="text-right text-xs font-bold uppercase tracking-[0.14em] text-white/55">
            Tanzania
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <p className="brand-kicker text-[var(--accent-secondary-text)]">Usajili</p>
            <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">
              Jisajili kwa {TZ_TOURNAMENT.swahiliTitle}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72 sm:text-base">
              Jaza taarifa zako kwa usahihi. Baada ya kutuma fomu, malipo yanafanyika nje ya
              Mechi kupitia Airtel Money, kisha screenshot inatumwa kwa Days Esports WhatsApp.
            </p>

            {state.status === 'success' ? (
              <section className="mt-6 rounded-lg border border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.09)] p-5">
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-1 shrink-0 text-[var(--accent-secondary-text)]" size={20} />
                  <div>
                    <h2 className="text-xl font-black text-white">Usajili umetumwa</h2>
                    <p className="mt-2 text-sm leading-7 text-white/76">{state.message}</p>
                    <ol className="mt-4 space-y-2 text-sm leading-7 text-white/76">
                      <li>1. Lipa {TZ_TOURNAMENT.entryFeeLabel} kupitia Airtel Money kwenda {TZ_TOURNAMENT.paymentNumber}</li>
                      <li>2. Tuma screenshot ya ujumbe wa muamala WhatsApp {TZ_TOURNAMENT.supportNumber}</li>
                      <li>3. Subiri uthibitisho kutoka Days Esports</li>
                    </ol>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <a href={getTanzaniaTournamentWhatsappUrl()} className="btn-primary justify-center">
                        <MessageCircle size={16} />
                        Tuma screenshot
                      </a>
                      <a href={getTanzaniaTournamentCallUrl()} className="btn-ghost justify-center">
                        <Phone size={16} />
                        Piga simu
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-white">Jina kamili</span>
                  <input name="full_name" required minLength={2} maxLength={120} className="input" placeholder="Mfano: Juma Hassan" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-white">Namba ya simu</span>
                  <input name="phone" required minLength={9} maxLength={32} className="input" placeholder="+255..." />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-white">WhatsApp</span>
                  <input name="whatsapp_number" maxLength={32} className="input" placeholder="+255..." />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-white">Email</span>
                  <input name="email" type="email" maxLength={160} className="input" placeholder="jina@example.com" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-white">Jina la eFootball</span>
                  <input name="in_game_username" required minLength={2} maxLength={80} className="input" placeholder="Jina ndani ya mchezo" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-white">Konami ID</span>
                  <input name="konami_id" maxLength={80} className="input" placeholder="Hiari" />
                </label>
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-bold text-white">Mkoa / jiji</span>
                  <input name="city" maxLength={80} className="input" placeholder="Mfano: Dar es Salaam" />
                </label>
              </div>

              {state.status === 'error' ? (
                <p className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {state.message}
                </p>
              ) : null}

              <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full justify-center">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                Tuma usajili
              </button>
            </form>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <p className="section-title text-[var(--accent-secondary-text)]">Malipo</p>
              <p className="mt-3 text-2xl font-black text-white">{TZ_TOURNAMENT.entryFeeLabel}</p>
              <div className="mt-4 space-y-2 text-sm leading-7 text-white/72">
                <p>Airtel Money: <strong className="text-white">{TZ_TOURNAMENT.paymentNumber}</strong></p>
                <p>Tuma screenshot ya muamala WhatsApp: <strong className="text-white">{TZ_TOURNAMENT.supportNumber}</strong></p>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <p className="section-title text-[var(--accent-secondary-text)]">Kumbuka</p>
              <p className="mt-3 text-sm leading-7 text-white/72">
                Website haitapokea screenshot kwa sasa. Uthibitisho wote wa malipo unafanywa na
                Days Esports kupitia WhatsApp au simu.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
