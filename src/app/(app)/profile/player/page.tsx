import Link from 'next/link';
import { notFound } from 'next/navigation';

type LeaderboardPlayerProfilePageProps = {
  searchParams: Promise<{
    detail?: string;
    game?: string;
    latest?: string;
    name?: string;
    score?: string;
  }>;
};

function cleanParam(value: string | undefined, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 160) : fallback;
}

export default async function LeaderboardPlayerProfilePage({
  searchParams,
}: LeaderboardPlayerProfilePageProps) {
  const params = await searchParams;
  const name = cleanParam(params.name);

  if (!name) {
    notFound();
  }

  const game = cleanParam(params.game, 'Tournament');
  const score = cleanParam(params.score, 'Leaderboard entry');
  const detail = cleanParam(params.detail, 'Verified tournament player');
  const latest = cleanParam(params.latest, 'Tournament result');
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-strong)] text-3xl font-black text-[var(--accent-secondary-text)] shadow-[var(--shadow-soft)]">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="section-title">Leaderboard profile</p>
              <h1 className="mt-2 truncate text-3xl font-black text-[var(--text-primary)] sm:text-[3rem]">
                {name}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                This player is listed from verified {game} tournament results.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="brand-chip px-3 py-1">{game}</span>
                <span className="brand-chip px-3 py-1">{score}</span>
              </div>
            </div>
          </div>

          <Link href="/leaderboard" className="btn-outline">
            Back to leaderboard
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="card p-5">
          <p className="section-title">Result detail</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
        </div>
        <div className="card p-5">
          <p className="section-title">Latest</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{latest}</p>
        </div>
      </section>
    </div>
  );
}
