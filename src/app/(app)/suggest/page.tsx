'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { Suggestion } from '@/types';
import toast from 'react-hot-toast';
import { ChevronUp, Lightbulb, Plus, X, Loader2 } from 'lucide-react';

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
    fetchSuggestions();
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
        prev.map((s) =>
          s.id === id ? { ...s, votes: data.votes, user_voted: data.voted } : s
        )
      );
    } finally {
      setVotingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success('Suggestion submitted! 🎮');
      setSuggestions((prev) => [{ ...data.suggestion, user_voted: false }, ...prev]);
      setForm({ game_name: '', description: '' });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Suggestions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vote for games to add</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Suggest'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Suggest a Game</h2>
          <div className="space-y-3">
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
                placeholder="Tell us why this game would be great on Mechi..."
                className="input min-h-[80px] resize-none"
                maxLength={300}
              />
            </div>
            <button type="submit" disabled={submitting} className="w-full btn-primary">
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

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 shimmer rounded-2xl" />)}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="card p-12 text-center">
          <Lightbulb size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-semibold text-gray-600 dark:text-gray-400">No suggestions yet</p>
          <p className="text-sm text-gray-400 mt-1">Be the first to suggest a game!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="card p-4 flex gap-3">
              {/* Vote button */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handleVote(suggestion.id)}
                  disabled={votingId === suggestion.id}
                  className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-colors ${
                    suggestion.user_voted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600'
                  }`}
                >
                  {votingId === suggestion.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ChevronUp size={16} />
                  )}
                </button>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  {suggestion.votes}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                    {suggestion.game_name}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    suggestion.status === 'approved'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : suggestion.status === 'rejected'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    {suggestion.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                  {suggestion.description}
                </p>
                <p className="text-xs text-gray-400 mt-1">
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
