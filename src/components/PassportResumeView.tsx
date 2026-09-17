'use client';

import Link from 'next/link';
import {
  Download,
  ExternalLink,
  Medal,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PassportCompetitiveResume } from '@/lib/passport-resume-types';

export function PassportResumeView({
  resume,
  owner = false,
}: {
  resume: PassportCompetitiveResume;
  owner?: boolean;
}) {
  const [gameFilter, setGameFilter] = useState('all');
  const matches = useMemo(
    () => resume.matches.filter(
      (match) => gameFilter === 'all' || match.game === gameFilter
    ),
    [gameFilter, resume.matches]
  );
  const tournaments = useMemo(
    () => resume.tournaments.filter(
      (event) => gameFilter === 'all' || event.game === gameFilter
    ),
    [gameFilter, resume.tournaments]
  );
  const ownerView = owner && resume.access === 'owner';
  const headline = resume.access === 'owner'
    ? resume.cv_settings.headline
    : resume.presentation.headline;
  const inquiryUrl = resume.access === 'owner'
    ? resume.cv_settings.inquiry_enabled
      ? resume.cv_settings.inquiry_url
      : null
    : resume.presentation.inquiry_url;
  const showEvents = resume.access === 'owner'
    ? resume.cv_settings.include_events
    : resume.events.length > 0;
  const showTeams = resume.access === 'owner'
    ? resume.cv_settings.include_teams
    : resume.teams.length > 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <header className="rounded-[2rem] border border-white/10 bg-[#0e1927] p-6 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#32E0C4]">
          Mechi V5 · Verified Gamer Resume
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-black text-white sm:text-5xl">
              {resume.identity.display_name}
            </h1>
            <p className="mt-2 text-white/45">
              @{resume.identity.username} · Generated{' '}
              {new Date(resume.generated_at).toLocaleDateString()}
            </p>
            {headline ? (
              <p className="mt-3 max-w-2xl text-sm text-white/65">{headline}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {ownerView ? (
              <Link href="/passport/resume/settings" className="btn-outline">
                CV settings
              </Link>
            ) : null}
            {inquiryUrl ? (
              <a
                href={inquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline inline-flex items-center gap-2"
              >
                <ExternalLink size={15} />
                Contact player
              </a>
            ) : null}
            <a
              href={`/api/passport/cv/${encodeURIComponent(resume.identity.username)}/pdf`}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Download size={15} />
              Download Gamer CV
            </a>
          </div>
        </div>
      </header>

      {resume.games.length > 1 ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-white/35">
            Filter performance
          </span>
          <button
            type="button"
            onClick={() => setGameFilter('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              gameFilter === 'all'
                ? 'bg-[#32E0C4] text-[#071018]'
                : 'bg-white/[.06] text-white/60'
            }`}
          >
            All games
          </button>
          {resume.games.map((game) => (
            <button
              key={game.game}
              type="button"
              onClick={() => setGameFilter(game.game)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                gameFilter === game.game
                  ? 'bg-[#32E0C4] text-[#071018]'
                  : 'bg-white/[.06] text-white/60'
              }`}
            >
              {game.label}
            </button>
          ))}
        </div>
      ) : null}

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resume.games.map((game) => (
          <article
            key={game.game}
            className="rounded-2xl border border-white/10 bg-white/[.035] p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-black text-white">{game.label}</h2>
              <ShieldCheck size={17} className="text-[#32E0C4]" />
            </div>
            <p className="mt-5 text-4xl font-black text-white">{game.current_rating}</p>
            <p className="text-xs text-white/40">
              Current rating · Peak {game.peak_rating}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Metric value={game.matches} label="Matches" />
              <Metric value={game.wins} label="Wins" />
              <Metric value={`${game.win_rate}%`} label="Win rate" />
            </div>
            <p className="mt-4 border-t border-white/8 pt-3 text-xs text-white/45">
              {game.tournament_entries} tournament entries · {game.tournament_wins}{' '}
              championships
            </p>
          </article>
        ))}
        {!resume.games.length ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-white/40">
            Verified completed matches will build game-specific competitive cards here.
          </div>
        ) : null}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-black text-white">
            <Swords size={18} />
            Verified match history
          </h2>
          <div className="mt-4 space-y-2">
            {matches.slice(0, 12).map((match) => (
              <div
                key={match.id}
                className="grid grid-cols-[70px_1fr_auto] items-center gap-3 rounded-xl bg-white/[.03] p-3 text-sm"
              >
                <span
                  className={`font-black uppercase ${
                    match.result === 'win'
                      ? 'text-[#32E0C4]'
                      : match.result === 'loss'
                        ? 'text-rose-400'
                        : 'text-white/55'
                  }`}
                >
                  {match.result}
                </span>
                <span className="text-white/65">
                  {match.game} vs @{match.opponent_username}
                </span>
                <span className="text-xs text-white/35">
                  {match.score ?? match.completed_at.slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 p-5">
          <h2 className="flex items-center gap-2 font-black text-white">
            <Trophy size={18} />
            Tournament record
          </h2>
          <div className="mt-4 space-y-3">
            {tournaments.slice(0, 10).map((event) => (
              <div
                key={`${event.game}-${event.title}-${event.registration_state}`}
                className="rounded-xl bg-white/[.03] p-3"
              >
                <p className="font-bold text-white">{event.title}</p>
                <p className="mt-1 text-xs text-white/40">
                  {event.registration_state.replace('_', ' ')}
                  {event.champion
                    ? ' · Champion'
                    : event.highest_round
                      ? ` · Round ${event.highest_round}`
                      : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {resume.seasons.length ? (
        <section className="mt-5 rounded-2xl border border-white/10 p-5">
          <h2 className="font-black text-white">Season history</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resume.seasons
              .filter((season) => gameFilter === 'all' || season.game === gameFilter)
              .map((season) => (
                <div key={season.id} className="rounded-xl bg-white/[.035] p-4">
                  <p className="font-bold text-white">{season.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-[#32E0C4]">
                    {season.game}
                  </p>
                  <p className="mt-3 text-sm text-white/55">
                    {season.matches} matches · peak {season.peak_rating} ·{' '}
                    {season.tournament_wins} titles
                  </p>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {showEvents ? (
        <section className="mt-5 rounded-2xl border border-white/10 p-5">
          <h2 className="flex items-center gap-2 font-black text-white">
            <Medal size={18} />
            Event Passport
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resume.events.map((event) => (
              <Link
                href={`/verify/passport/${event.verification_token}`}
                key={event.verification_token}
                className="rounded-xl bg-white/[.035] p-4 transition hover:bg-white/[.06]"
              >
                <p className="text-xs font-black uppercase tracking-wider text-[#32E0C4]">
                  {event.stamp_type.replace('_', ' ')}
                </p>
                <p className="mt-2 font-bold text-white">{event.event_title}</p>
                <p className="mt-2 text-xs text-white/38">
                  {event.occurred_at.slice(0, 10)} · Verified source
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {showTeams ? (
        <section className="mt-5 rounded-2xl border border-white/10 p-5">
          <h2 className="flex items-center gap-2 font-black text-white">
            <Users size={18} />
            Team history
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {resume.teams.map((team) => (
              <div
                key={`${team.name}-${team.role}-${team.joined_at}`}
                className="rounded-xl bg-white/[.035] px-4 py-3"
              >
                <p className="font-bold text-white">{team.name}</p>
                <p className="text-xs text-white/40">
                  {team.role} · {team.membership_status}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-black/15 p-2">
      <p className="font-black text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}
