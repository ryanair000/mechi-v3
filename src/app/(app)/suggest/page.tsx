'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUp,
  Gamepad2,
  Loader2,
  Send,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { getLoginPath, withQuery } from '@/lib/navigation';
import type { Suggestion } from '@/types';

function formatSuggestionDate(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function getStatusClasses(status: Suggestion['status']) {
  switch (status) {
    case 'approved':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]';
    case 'rejected':
      return 'bg-red-500/12 text-red-300';
    default:
      return 'bg-[var(--surface-strong)] text-[var(--text-secondary)]';
  }
}

export default function SuggestPage() {
  const router = useRouter();
  const { clearLocalAuth } = useAuth();
  const authFetch = useAuthFetch();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [form, setForm] = useState({ game_name: '', description: '' });
  const handleAuthExpired = useCallback(() => {
    clearLocalAuth();
    toast.error('Your session expired. Sign in again to continue.');
    router.replace(getLoginPath('/suggest', 'session_expired'));
  }, [clearLocalAuth, router]);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/suggestions');
      if (res.ok) {
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
      } else if (res.status === 401 || res.status === 403) {
        handleAuthExpired();
      } else {
        setSuggestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, handleAuthExpired]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  const handleVote = async (id: string) => {
    setVotingId(id);
    try {
      const res = await authFetch(`/api/suggestions/${id}/vote`, { method: 'POST' });
      const data = (await res.json()) as { error?: string; votes?: number; voted?: boolean };
      if (res.status === 401 || res.status === 403) {
        handleAuthExpired();
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? 'Vote failed');
        return;
      }
      setSuggestions((prev) =>
        prev.map((suggestion) =>
          suggestion.id === id
            ? {
                ...suggestion,
                votes: data.votes ?? suggestion.votes,
                user_voted: data.voted ?? suggestion.user_voted,
              }
            : suggestion
        )
      );
    } finally {
      setVotingId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.game_name.trim() || !form.description.trim()) {
      toast.error('Fill in both fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/suggestions', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string; suggestion?: Suggestion };
      if (res.status === 401 || res.status === 403) {
        handleAuthExpired();
        return;
      }
      if (!res.ok || !data.suggestion) {
        toast.error(data.error ?? 'Failed to submit');
        return;
      }

      const createdSuggestion: Suggestion = {
        ...data.suggestion,
        user_voted: false,
      };

      toast.success('Suggestion submitted');
      setSuggestions((prev) => [createdSuggestion, ...prev]);
      setForm({ game_name: '', description: '' });
      router.push(
        withQuery('/suggest/complete', {
          game: createdSuggestion.game_name,
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="max-w-2xl">
          <p className="section-title">Suggest a Game</p>
          <h1 className="mt-3 text-[1.55rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
            What should Mechi support next?
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Pitch the next title for the platform, then push the strongest community requests upward.
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <div className="card p-5">
          <p className="text-sm font-black text-[var(--text-primary)]">Submit a suggestion</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="label">Game title</label>
              <input
                type="text"
                value={form.game_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, game_name: event.target.value }))
                }
                placeholder="e.g. Rocket League Mobile"
                className="input"
                maxLength={60}
              />
            </div>

            <div>
              <label className="label">Why should Mechi add it?</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Explain the player base, the competitive scene, or why it fits Mechi."
                className="input min-h-[104px] resize-none"
                maxLength={300}
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Submit suggestion
                </>
              )}
            </button>
          </form>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3">
            <div>
              <p className="section-title !mb-0">Community Suggestions</p>
            </div>
            <span className="brand-chip px-3 py-1">{suggestions.length} open</span>
          </div>

          {loading ? (
            <div className="space-y-0">
              {[1, 2, 3, 4].map((item, index) => (
                <div
                  key={item}
                  className={`px-4 py-4 ${index < 3 ? 'border-b border-[var(--border-color)]' : ''}`}
                >
                  <div className="h-14 shimmer rounded-xl" />
                </div>
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Gamepad2 size={36} className="mx-auto mb-3 text-[var(--text-soft)] opacity-60" />
              <p className="font-semibold text-[var(--text-primary)]">No suggestions yet</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Be the first person to suggest the next title for the Mechi community.
              </p>
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={`flex items-center gap-3 px-4 py-4 ${
                  index < suggestions.length - 1 ? 'border-b border-[var(--border-color)]' : ''
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)]">
                  <Gamepad2 size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-[var(--text-primary)]">
                      {suggestion.game_name}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${getStatusClasses(suggestion.status)}`}
                    >
                      {suggestion.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {suggestion.description}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-soft)]">
                    Submitted {formatSuggestionDate(suggestion.created_at)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleVote(suggestion.id)}
                  disabled={votingId === suggestion.id}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold transition-colors ${
                    suggestion.user_voted
                      ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:border-[rgba(50,224,196,0.22)] hover:bg-[rgba(50,224,196,0.08)] hover:text-[var(--accent-secondary-text)]'
                  }`}
                >
                  {votingId === suggestion.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ArrowUp size={13} />
                  )}
                  {suggestion.votes}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
