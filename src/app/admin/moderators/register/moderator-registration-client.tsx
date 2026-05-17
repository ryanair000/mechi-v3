'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import {
  DEFAULT_MODERATOR_TOURNAMENT_KEY,
  MODERATOR_TOURNAMENTS,
  getModeratorTournamentByKey,
  type ModeratorTournamentKey,
} from '@/lib/moderator-tournaments';
import type { AuthUser, UserRole } from '@/types';

type StaffRole = Extract<UserRole, 'moderator' | 'admin'>;
type RegistrationMode = 'admin' | 'public' | 'self';

type CreatedStaff = {
  id: string;
  username: string;
  phone: string;
  email: string | null;
  role: StaffRole;
  moderator_tournament_key?: ModeratorTournamentKey | null;
  created_at: string;
};

const API_PATH = '/api/moderators/register';

type RegistrationResponse = {
  staff?: CreatedStaff;
  token?: string;
  user?: AuthUser;
  error?: string;
};

export function ModeratorRegistrationClient({ mode = 'admin' }: { mode?: RegistrationMode }) {
  const { login } = useAuth();
  const authFetch = useAuthFetch();
  const [submitting, setSubmitting] = useState(false);
  const [createdStaff, setCreatedStaff] = useState<CreatedStaff | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<ModeratorTournamentKey>(
    DEFAULT_MODERATOR_TOURNAMENT_KEY
  );
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'moderator' as StaffRole,
    moderatorTournament: DEFAULT_MODERATOR_TOURNAMENT_KEY,
  });

  const updateForm = (updates: Partial<typeof form>) => {
    setForm((current) => ({ ...current, ...updates }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setCreatedStaff(null);

    try {
      const res = await authFetch(API_PATH, {
        method: 'POST',
        body: JSON.stringify(
          mode === 'self'
            ? { mode: 'self_service', moderator_tournament_key: selectedTournament }
            : {
                mode: mode === 'public' ? 'public' : 'admin',
                username: form.username,
                email: form.email,
                phone: form.phone,
                password: form.password,
                role: mode === 'public' ? 'moderator' : form.role,
                moderator_tournament_key:
                  mode === 'public' ? selectedTournament : form.moderatorTournament,
              }
        ),
      });
      const data = (await res.json()) as RegistrationResponse;

      if (!res.ok || !data.staff) {
        toast.error(
          data.error ??
            (mode === 'self'
              ? 'Could not activate moderator access'
              : mode === 'public'
                ? 'Could not create moderator account'
                : 'Could not create staff account')
        );
        return;
      }

      setCreatedStaff(data.staff);
      if (mode === 'public' || mode === 'self') {
        if (data.token && data.user) {
          login(data.token, data.user);
        }
        const tournament = getModeratorTournamentByKey(
          data.staff.moderator_tournament_key ?? selectedTournament
        );
        toast.success(mode === 'public' ? 'Moderator account created' : 'Moderator access activated');
        window.location.assign(
          tournament.key === 'days_esports_tz_efootball'
            ? '/moderators/tz'
            : `/moderators/check-in?game=${encodeURIComponent(tournament.game)}`
        );
        return;
      }

      setForm({
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'moderator',
        moderatorTournament: DEFAULT_MODERATOR_TOURNAMENT_KEY,
      });
      toast.success(`${data.staff.username} created as ${data.staff.role}`);
    } catch {
      toast.error(
        mode === 'self'
          ? 'Network error while activating moderator access'
          : mode === 'public'
            ? 'Network error while creating moderator account'
          : 'Network error while creating staff account'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'self') {
    return (
      <div className="space-y-5">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="brand-kicker">Moderator registration</p>
              <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                Activate moderator access
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                Use your current Mechi account for the CODM moderation desk, check-ins, lobby
                flow, and tournament review.
              </p>
            </div>

            <Link href="/moderators" className="btn-ghost">
              <ShieldCheck size={14} />
              Moderator desk
            </Link>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-title">Access request</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Sign up as moderator
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Your account will be added to the moderator roster.
              </p>
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Tournament
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {MODERATOR_TOURNAMENTS.map((tournament) => {
                    const selected = selectedTournament === tournament.key;
                    return (
                      <label
                        key={tournament.key}
                        className={`cursor-pointer rounded-lg border px-3 py-3 transition-colors ${
                          selected
                            ? 'border-[rgba(50,224,196,0.36)] bg-[rgba(50,224,196,0.12)] text-[var(--text-primary)]'
                            : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:border-[rgba(50,224,196,0.24)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="moderator_tournament_key"
                          value={tournament.key}
                          checked={selected}
                          onChange={() => setSelectedTournament(tournament.key)}
                          className="sr-only"
                        />
                        <span className="block text-sm font-black">{tournament.label}</span>
                        <span className="mt-1 block text-xs font-bold text-[var(--text-soft)]">
                          {tournament.shortLabel}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary justify-center">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Activate access
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (mode === 'public') {
    return (
      <div className="space-y-5">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="brand-kicker">Moderator registration</p>
              <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                Create moderator account
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                This creates a normal Mechi account with moderator access for the tournament desk.
              </p>
            </div>

            <Link href="/moderator-login" className="btn-ghost">
              <ShieldCheck size={14} />
              Sign in
            </Link>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-soft)]">Username</span>
                <input
                  required
                  value={form.username}
                  onChange={(event) => updateForm({ username: event.target.value })}
                  className="input mt-1"
                  placeholder="moderator_name"
                  autoComplete="username"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[var(--text-soft)]">Phone</span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateForm({ phone: event.target.value })}
                  className="input mt-1"
                  placeholder="0712345678"
                  autoComplete="tel"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-xs font-bold text-[var(--text-soft)]">Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm({ email: event.target.value })}
                  className="input mt-1"
                  placeholder="moderator@mechi.club"
                  autoComplete="email"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-xs font-bold text-[var(--text-soft)]">Password</span>
                <input
                  required
                  type="password"
                  minLength={9}
                  value={form.password}
                  onChange={(event) => updateForm({ password: event.target.value })}
                  className="input mt-1"
                  placeholder="At least 9 characters"
                  autoComplete="new-password"
                />
              </label>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Tournament
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {MODERATOR_TOURNAMENTS.map((tournament) => {
                  const selected = selectedTournament === tournament.key;
                  return (
                    <label
                      key={tournament.key}
                      className={`cursor-pointer rounded-lg border px-3 py-3 transition-colors ${
                        selected
                          ? 'border-[rgba(50,224,196,0.36)] bg-[rgba(50,224,196,0.12)] text-[var(--text-primary)]'
                          : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:border-[rgba(50,224,196,0.24)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="moderator_tournament_key"
                        value={tournament.key}
                        checked={selected}
                        onChange={() => setSelectedTournament(tournament.key)}
                        className="sr-only"
                      />
                      <span className="block text-sm font-black">{tournament.label}</span>
                      <span className="mt-1 block text-xs font-bold text-[var(--text-soft)]">
                        {tournament.shortLabel}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center md:w-auto">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Create moderator account
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="brand-kicker">Staff registration</p>
            <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">
              Create moderator access
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Add trusted moderators for tournament operations, support review, result checks, and
              CODM match-room work. Admin role gives full control-room access.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/moderators" className="btn-ghost">
              <ShieldCheck size={14} />
              CODM desk
            </Link>
            <Link href="/admin/users?role=moderator" className="btn-ghost">
              Staff list
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,0.55fr)]">
        <section className="card p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold text-[var(--text-soft)]">Username</span>
                <input
                  required
                  value={form.username}
                  onChange={(event) => updateForm({ username: event.target.value })}
                  className="input mt-1"
                  placeholder="moderator_name"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[var(--text-soft)]">Role</span>
                <select
                  value={form.role}
                  onChange={(event) => updateForm({ role: event.target.value as StaffRole })}
                  className="input mt-1"
                >
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin - all access</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-xs font-bold text-[var(--text-soft)]">
                  Tournament to moderate
                </span>
                <select
                  required
                  value={form.moderatorTournament}
                  onChange={(event) =>
                    updateForm({
                      moderatorTournament: event.target.value as ModeratorTournamentKey,
                    })
                  }
                  className="input mt-1"
                >
                  {MODERATOR_TOURNAMENTS.map((tournament) => (
                    <option key={tournament.key} value={tournament.key}>
                      {tournament.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[var(--text-soft)]">Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm({ email: event.target.value })}
                  className="input mt-1"
                  placeholder="staff@mechi.club"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[var(--text-soft)]">Phone</span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateForm({ phone: event.target.value })}
                  className="input mt-1"
                  placeholder="0712345678"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-xs font-bold text-[var(--text-soft)]">Temporary password</span>
                <input
                  required
                  type="password"
                  minLength={9}
                  value={form.password}
                  onChange={(event) => updateForm({ password: event.target.value })}
                  className="input mt-1"
                  placeholder="At least 9 characters"
                  autoComplete="new-password"
                />
              </label>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center md:w-auto">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Create staff account
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          {createdStaff ? (
            <section className="card p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]">
                  <CheckCircle2 size={18} />
                </span>
                <div>
                  <p className="section-title">Created</p>
                  <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                    {createdStaff.username}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Role: {createdStaff.role}. Tournament:{' '}
                    {getModeratorTournamentByKey(
                      createdStaff.moderator_tournament_key ?? DEFAULT_MODERATOR_TOURNAMENT_KEY
                    ).label}
                    . They can sign in with the phone/email and temporary password you set.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="card p-5">
            <p className="section-title">Access levels</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                Moderator accounts can use operational queues such as CODM desk, user review, support,
                tournament and result tools.
              </p>
              <p>
                Admin accounts can also create staff, change roles, use messaging tools, and access the
                full control room.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
