'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Gamepad2,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import {
  DEFAULT_PASSPORT_FIELD_VISIBILITY,
  PASSPORT_ARCHETYPES,
  PASSPORT_ARCHETYPE_LABELS,
  PASSPORT_FIELDS,
  PASSPORT_STATUS_LABELS,
  PASSPORT_STATUSES,
  PASSPORT_VISIBILITIES,
  type PassportArchetype,
  type PassportField,
  type PassportFieldVisibility,
  type PassportOwnerData,
  type PassportStatus,
  type PassportVisibility,
} from '@/lib/passport-types';

const FIELD_LABELS: Record<PassportField, string> = {
  bio: 'Bio',
  gamer_since: 'Gamer since',
  archetypes: 'Gamer archetypes',
  current_status: 'Current status',
  location: 'Country and region',
  platforms: 'Platforms',
  games: 'Selected games',
  game_ids: 'In-game IDs',
  competitive: 'Competitive record',
  events: 'Event Passport',
  achievements: 'Achievements and badges',
  teams: 'Teams',
  social: 'Friends and followers',
};

function visibilityLabel(value: PassportVisibility) {
  if (value === 'friends') return 'Friends';
  if (value === 'private') return 'Only me';
  return 'Public';
}

export function PassportEditor() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [passport, setPassport] = useState<PassportOwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [gamerSince, setGamerSince] = useState('');
  const [archetypes, setArchetypes] = useState<PassportArchetype[]>([]);
  const [currentStatus, setCurrentStatus] = useState<PassportStatus>('offline');
  const [defaultVisibility, setDefaultVisibility] = useState<PassportVisibility>('public');
  const [fieldVisibility, setFieldVisibility] = useState<PassportFieldVisibility>(
    DEFAULT_PASSPORT_FIELD_VISIBILITY
  );
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [cardAccent, setCardAccent] = useState('#32E0C4');

  const applyPassport = useCallback((nextPassport: PassportOwnerData) => {
    const identity = nextPassport.identity;
    setPassport(nextPassport);
    setDisplayName(identity.display_name);
    setBio(identity.bio);
    setGamerSince(identity.gamer_since ? String(identity.gamer_since) : '');
    setArchetypes(identity.archetypes);
    setCurrentStatus(identity.current_status);
    setDefaultVisibility(identity.default_visibility);
    setFieldVisibility(identity.field_visibility);
    setIsDiscoverable(identity.is_discoverable);
    setCardAccent(identity.card_accent);
  }, []);

  const loadPassport = useCallback(async () => {
    try {
      const response = await authFetch('/api/passport/me');
      const body = (await response.json()) as { error?: string; passport?: PassportOwnerData };
      if (!response.ok || !body.passport) {
        toast.error(body.error ?? 'Could not load Gamer Passport');
        return;
      }
      applyPassport(body.passport);
    } catch {
      toast.error('Could not load Gamer Passport');
    } finally {
      setLoading(false);
    }
  }, [applyPassport, authFetch]);

  useEffect(() => {
    let active = true;

    void authFetch('/api/passport/me')
      .then(async (response) => {
        const body = (await response.json()) as { error?: string; passport?: PassportOwnerData };
        if (!active) return;
        if (!response.ok || !body.passport) {
          toast.error(body.error ?? 'Could not load Gamer Passport');
          return;
        }
        applyPassport(body.passport);
      })
      .catch(() => {
        if (active) toast.error('Could not load Gamer Passport');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyPassport, authFetch]);

  const completion = useMemo(() => {
    const checks = [
      displayName.trim().length >= 2,
      bio.trim().length > 0,
      archetypes.length > 0,
      Boolean(gamerSince),
      Boolean(passport?.identity.games.length),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [archetypes.length, bio, displayName, gamerSince, passport?.identity.games.length]);

  const toggleArchetype = (archetype: PassportArchetype) => {
    setArchetypes((current) => {
      if (current.includes(archetype)) return current.filter((item) => item !== archetype);
      if (current.length >= 3) {
        toast.error('Choose up to three gamer archetypes');
        return current;
      }
      return [...current, archetype];
    });
  };

  const save = async () => {
    const parsedYear = gamerSince.trim() ? Number(gamerSince) : null;
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1970 || parsedYear > new Date().getFullYear())) {
      toast.error('Enter a valid gamer-since year');
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch('/api/passport/me', {
        method: 'PATCH',
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          bio: bio.trim(),
          gamer_since: parsedYear,
          archetypes,
          current_status: currentStatus,
          default_visibility: defaultVisibility,
          field_visibility: fieldVisibility,
          is_discoverable: isDiscoverable,
          card_accent: cardAccent,
        }),
      });
      const body = (await response.json()) as { error?: string; passport?: PassportOwnerData };
      if (!response.ok || !body.passport) {
        toast.error(body.error ?? 'Could not save Gamer Passport');
        return;
      }
      applyPassport(body.passport);
      toast.success('Gamer Passport saved');
    } catch {
      toast.error('Could not save Gamer Passport');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-48 shimmer" />
        <div className="h-72 shimmer" />
      </div>
    );
  }

  if (!passport) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 text-center">
        <div className="card p-8">
          <ShieldCheck className="mx-auto h-8 w-8 text-[var(--text-soft)]" />
          <h1 className="mt-4 text-2xl font-black text-[var(--text-primary)]">Gamer Passport unavailable</h1>
          <button type="button" onClick={() => { setLoading(true); void loadPassport(); }} className="btn-primary mt-5">Try again</button>
        </div>
      </div>
    );
  }

  const publicPath = `/@${encodeURIComponent(passport.identity.username)}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)]">
        <div
          className="relative overflow-hidden px-5 py-7 sm:px-7"
          style={{ background: `radial-gradient(circle at 82% 18%, ${cardAccent}33, transparent 34%), linear-gradient(135deg, var(--surface-strong), var(--surface))` }}
        >
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: cardAccent }} />
                <p className="section-title">Mechi V5 identity</p>
              </div>
              <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">PlayMechi Gamer Passport</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Control how your identity, games, competition, teams, and events appear across Mechi V5.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/passport/friends" className="btn-outline">
                <Users size={14} /> Friends
              </Link>
              <Link href="/passport/compare" className="btn-outline">
                <Swords size={14} /> Compare
              </Link>
              <Link href="/passport/resume" className="btn-outline">
                <ShieldCheck size={14} /> Competitive Resume
              </Link>
              <Link href="/passport/games" className="btn-outline">
                <Gamepad2 size={14} /> Manage game library
              </Link>
              <Link href="/passport/cards" className="btn-outline">
                <Sparkles size={14} /> Gamer Cards
              </Link>
              <Link href="/passport/highlights" className="btn-outline">
                <Sparkles size={14} /> Highlights
              </Link>
              <Link href="/passport/progression" className="btn-outline">
                <Sparkles size={14} /> Progression
              </Link>
              <Link href="/passport/customize" className="btn-outline">
                <Sparkles size={14} /> Customize
              </Link>
              <Link href="/passport/replay" className="btn-outline">
                <Sparkles size={14} /> Annual Replay
              </Link>
              <Link href="/passport/media-kit" className="btn-outline">
                <ShieldCheck size={14} /> Media Kit
              </Link>
              <Link href="/passport/connections" className="btn-outline">
                <ShieldCheck size={14} /> Platform Connections
              </Link>
              <Link href="/passport/developer" className="btn-outline">
                <ShieldCheck size={14} /> Developer Access
              </Link>
              <Link href={publicPath} className="btn-outline">
                Preview public Passport <ArrowRight size={14} />
              </Link>
              <button type="button" onClick={() => void save()} disabled={saving || !passport.identity.storage_ready} className="btn-primary">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save Passport
              </button>
            </div>
          </div>
        </div>
      </section>

      {!passport.identity.storage_ready ? (
        <section className="rounded-[var(--radius-card)] border border-amber-300/20 bg-amber-300/[0.07] p-4 text-sm leading-6 text-amber-100/80">
          The Phase 1 Passport migration has not been applied to this environment. Existing Mechi history is visible, but personalization is read-only until storage is ready.
        </section>
      ) : null}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-title">Passport readiness</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Build a profile worth sharing</h2>
          </div>
          <span className="brand-chip">{completion}% ready</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
          <span className="block h-full rounded-full transition-[width]" style={{ width: `${completion}%`, background: cardAccent }} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Readiness label="Mechi games" complete={passport.identity.games.length > 0} />
          <Readiness label="Competitive history" complete={(passport.summary?.total_matches ?? 0) > 0} />
          <Readiness label="Event history" complete={(passport.summary?.tournaments_registered ?? 0) > 0} />
          <Readiness label="Gamer identity" complete={archetypes.length > 0 && bio.length > 0} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <div className="space-y-5">
          <section className="card space-y-5 p-5 sm:p-6">
            <div>
              <p className="section-title">Identity</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">How players know you</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="label">Display name</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} className="input-field" placeholder={user?.username ?? 'Gamer name'} />
              </label>
              <label className="space-y-2">
                <span className="label">Gamer since</span>
                <input value={gamerSince} onChange={(event) => setGamerSince(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" className="input-field" placeholder="2014" />
              </label>
            </div>

            <label className="space-y-2">
              <span className="label">Bio</span>
              <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={4} className="input-field resize-none" placeholder="Competitive player, story explorer, tournament regular..." />
              <span className="block text-right text-xs text-[var(--text-soft)]">{bio.length}/280</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="label">Current status</span>
                <select value={currentStatus} onChange={(event) => setCurrentStatus(event.target.value as PassportStatus)} className="input-field">
                  {PASSPORT_STATUSES.map((status) => <option key={status} value={status}>{PASSPORT_STATUS_LABELS[status]}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="label">Passport accent</span>
                <div className="flex gap-2">
                  <input type="color" value={cardAccent} onChange={(event) => setCardAccent(event.target.value.toUpperCase())} className="h-11 w-14 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-1" />
                  <input value={cardAccent} onChange={(event) => setCardAccent(event.target.value.toUpperCase())} maxLength={7} className="input-field" />
                </div>
              </label>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="section-title">Gamer archetypes</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Choose up to three</h2>
              </div>
              <span className="text-xs font-bold text-[var(--text-soft)]">{archetypes.length}/3 selected</span>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PASSPORT_ARCHETYPES.map((archetype) => {
                const selected = archetypes.includes(archetype);
                return (
                  <button
                    key={archetype}
                    type="button"
                    onClick={() => toggleArchetype(archetype)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-bold transition-colors ${selected ? 'border-[rgba(50,224,196,0.3)] bg-[rgba(50,224,196,0.09)] text-[var(--text-primary)]' : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  >
                    {PASSPORT_ARCHETYPE_LABELS[archetype]}
                    {selected ? <Check size={14} style={{ color: cardAccent }} /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-2.5"><LockKeyhole size={18} className="text-[var(--accent-secondary-text)]" /></span>
              <div>
                <p className="section-title">Privacy</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">You control every section</h2>
              </div>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="label">Default Passport visibility</span>
              <select value={defaultVisibility} onChange={(event) => setDefaultVisibility(event.target.value as PassportVisibility)} className="input-field">
                {PASSPORT_VISIBILITIES.map((visibility) => <option key={visibility} value={visibility}>{visibilityLabel(visibility)}</option>)}
              </select>
              <span className="block text-xs leading-5 text-[var(--text-soft)]">Friends-only sections stay hidden from strangers until the Phase 3 friend graph launches.</span>
            </label>

            <div className="mt-5 divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4">
              {PASSPORT_FIELDS.map((field) => (
                <label key={field} className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm font-bold text-[var(--text-secondary)]">{FIELD_LABELS[field]}</span>
                  <select
                    value={fieldVisibility[field]}
                    onChange={(event) => setFieldVisibility((current) => ({ ...current, [field]: event.target.value as PassportVisibility }))}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-strong)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-primary)]"
                  >
                    {PASSPORT_VISIBILITIES.map((visibility) => <option key={visibility} value={visibility}>{visibilityLabel(visibility)}</option>)}
                  </select>
                </label>
              ))}
            </div>

            <button type="button" onClick={() => setIsDiscoverable((current) => !current)} className="mt-5 flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-left">
              <span>
                <span className="block text-sm font-black text-[var(--text-primary)]">Profile discovery</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--text-soft)]">Allow your Passport to appear in future gamer search and discovery.</span>
              </span>
              {isDiscoverable ? <Eye size={19} className="text-emerald-300" /> : <EyeOff size={19} className="text-[var(--text-soft)]" />}
            </button>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} style={{ color: cardAccent }} />
              <h2 className="text-lg font-black text-[var(--text-primary)]">Trust summary</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <TrustMetric value={passport.summary?.verified_records_count ?? 0} label="Verified records" />
              <TrustMetric value={passport.summary?.events_attended ?? 0} label="Event check-ins" />
              <TrustMetric value={passport.summary?.total_matches ?? 0} label="Mechi matches" />
              <TrustMetric value={passport.summary?.teams_count ?? 0} label="Active teams" />
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--text-soft)]">Verification is attached to individual facts. Personalizing this page does not turn self-reported information into a verified claim.</p>
          </section>
        </div>
      </div>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex justify-end lg:bottom-4">
        <button type="button" onClick={() => void save()} disabled={saving || !passport.identity.storage_ready} className="btn-primary shadow-2xl">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Gamer Passport
        </button>
      </div>
    </div>
  );
}

function Readiness({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-3 text-xs font-bold text-[var(--text-secondary)]">
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${complete ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.05] text-[var(--text-soft)]'}`}>
        {complete ? <Check size={12} /> : '·'}
      </span>
      {label}
    </div>
  );
}

function TrustMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
      <p className="text-2xl font-black text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-soft)]">{label}</p>
    </div>
  );
}
