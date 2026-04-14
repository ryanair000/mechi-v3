'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ChevronUp, Lightbulb, Loader2, Plus, X } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { Suggestion } from '@/types';

export default function SuggestPage() {
  const authFetch = useAuthFetch();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [form, setForm] = useState({ game_name: '', description: '' });

  const fetchSuggestions = useCallback(async () => {
    const res = await authFetch('/api/suggestions');
    if (res.ok) {
      const data = await res.json();
      setSuggestions(data.suggestions);
    }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  const handleVote = async (id: string) => {
    setVotingId(id);
    try {
      const res = await authFetch(`/api/suggestions/${id}/vote`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Vote failed');
        return;
      }
      setSuggestions((prev) =>
        prev.map((suggestion) =>
          suggestion.id === id
            ? { ...suggestion, votes: data.votes, user_voted: data.voted }
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
      toast.error('Fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/suggestions', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to submit');
        return;
      }
      toast.success('Suggestion submitted!');
      setSuggestions((prev) => [{ ...data.suggestion, user_voted: false }, ...prev]);
      setForm({ game_name: '', description: '' });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card circuit-panel mb-5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="brand-kicker">Community Input</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--text-primary)]">
              Suggestions
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Tell us what should land on Mechi next, then vote the strongest ideas upward.
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'Suggest'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-5 p-5">
          <p className="brand-kicker">New Suggestion</p>
          <h2 className="mt-2 text-lg font-bold text-[var(--text-primary)]">Pitch a game for Mechi</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="label">Game Name</label>
              <input
                type="text"
                value={form.game_name}
                onChange={(e) => setForm({ ...form, game_name: e.target.value })}
                placeholder="e.g. Fortnite, FIFA 25..."
                className="input"
                maxLength={60}
              />
            </div>
            <div>
              <label className="label">Why should we add it?</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tell us how this game fits the Mechi community..."
                className="input min-h-[96px] resize-none"
                maxLength={300}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting...
                </>
              ) : (
                'Submit Suggestion'
              )}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-20 shimmer rounded-2xl" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="card p-12 text-center">
          <Lightbulb size={48} className="mx-auto mb-3 text-[var(--text-soft)]" />
          <p className="font-semibold text-[var(--text-primary)]">No suggestions yet</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Be the first to suggest the next competitive title.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="card flex gap-3 p-4">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handleVote(suggestion.id)}
                  disabled={votingId === suggestion.id}
                  className={`flex h-10 w-10 flex-col items-center justify-center rounded-xl transition-colors ${
                    suggestion.user_voted
                      ? 'bg-[var(--brand-coral)] text-[var(--brand-night)]'
                      : 'bg-[var(--surface-strong)] text-[var(--text-secondary)] hover:bg-[rgba(255,107,107,0.12)] hover:text-[var(--brand-coral)]'
                  }`}
                >
                  {votingId === suggestion.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ChevronUp size={16} />
                  )}
                </button>
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  {suggestion.votes}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {suggestion.game_name}
                  </h3>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    suggestion.status === 'approved'
                      ? 'bg-[rgba(50,224,196,0.16)] text-[var(--brand-teal)]'
                      : suggestion.status === 'rejected'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-[var(--surface-strong)] text-[var(--text-secondary)]'
                  }`}>
                    {suggestion.status}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {suggestion.description}
                </p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  {new Date(suggestion.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
