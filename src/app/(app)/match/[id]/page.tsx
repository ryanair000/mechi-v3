'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { GAMES, PLATFORMS, getPlatformAddUrl, getMatchingPlatform } from '@/lib/config';
import { RatingBadge } from '@/components/RatingBadge';
import { PlatformBadge } from '@/components/PlatformBadge';
import type { GameKey, PlatformKey } from '@/types';
import toast from 'react-hot-toast';
import { Swords, Check, X, Upload, ImageIcon, ExternalLink, Clock, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

interface MatchPlayer { id: string; username: string; game_ids: Record<string, string>; platforms: PlatformKey[]; }
interface MatchData {
  id: string; player1_id: string; player2_id: string; game: GameKey; region: string;
  status: 'pending' | 'completed' | 'disputed' | 'cancelled'; winner_id: string | null;
  player1_reported_winner: string | null; player2_reported_winner: string | null;
  rating_change_p1: number | null; rating_change_p2: number | null;
  dispute_screenshot_url: string | null; dispute_requested_by: string | null;
  created_at: string; player1: MatchPlayer; player2: MatchPlayer;
}

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const fetchMatch = useCallback(async () => {
    const res = await authFetch(`/api/matches/${matchId}`);
    if (res.ok) { const data = await res.json(); setMatch(data.match); }
    else router.push('/dashboard');
    setLoading(false);
  }, [authFetch, matchId, router]);

  useEffect(() => {
    fetchMatch();
    const supabase = createClient();
    const channel = supabase.channel(`match_${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, () => fetchMatch())
      .subscribe();
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [matchId, fetchMatch]);

  const handleReport = async (winnerId: string) => {
    setReporting(winnerId);
    try {
      const res = await authFetch(`/api/matches/${matchId}/report`, { method: 'POST', body: JSON.stringify({ winner_id: winnerId }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to report'); return; }
      if (data.status === 'completed') toast.success('Match completed! Rating updated.');
      else if (data.status === 'disputed') toast.error('Result disputed! Upload a screenshot.');
      else toast.success('Result reported. Waiting for opponent...');
      fetchMatch();
    } catch { toast.error('Network error'); }
    finally { setReporting(null); }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setUploadingScreenshot(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', file);
      const token = localStorage.getItem('mechi_token');
      const res = await fetch(`/api/matches/${matchId}/dispute`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Upload failed'); return; }
      toast.success('Screenshot uploaded'); fetchMatch();
    } catch { toast.error('Upload failed'); }
    finally { setUploadingScreenshot(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this match?')) return;
    setCancelling(true);
    try {
      const res = await authFetch(`/api/matches/${matchId}/cancel`, { method: 'POST' });
      if (res.ok) { toast.success('Match cancelled'); router.push('/dashboard'); }
      else { const data = await res.json(); toast.error(data.error ?? 'Failed to cancel'); }
    } finally { setCancelling(false); }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/20 text-sm">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match || !user) return null;

  const isPlayer1 = user.id === match.player1_id;
  const me = isPlayer1 ? match.player1 : match.player2;
  const opponent = isPlayer1 ? match.player2 : match.player1;
  const game = GAMES[match.game];
  const gamePlatforms = game?.platforms ?? [];
  const myPlatform = getMatchingPlatform(me.platforms, gamePlatforms);
  const opponentPlatform = getMatchingPlatform(opponent.platforms, gamePlatforms);
  const displayPlatform = opponentPlatform ?? myPlatform;
  const opponentPlatformId = displayPlatform ? (opponent.game_ids?.[displayPlatform] || 'Not set') : 'Not set';
  const myRatingChange = isPlayer1 ? match.rating_change_p1 : match.rating_change_p2;
  const iWon = match.winner_id === user.id;
  const myReport = isPlayer1 ? match.player1_reported_winner : match.player2_reported_winner;
  const opponentReport = isPlayer1 ? match.player2_reported_winner : match.player1_reported_winner;
  const platformAddUrl = displayPlatform ? getPlatformAddUrl(displayPlatform, opponentPlatformId) : null;

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto">
        {/* Game header */}
        <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Swords size={16} className="text-emerald-400" />
            <span className="font-semibold text-sm text-emerald-400">{game?.label}</span>
            <span className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
              match.status === 'pending' ? 'bg-white/[0.06] text-white/50' :
              match.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
              match.status === 'disputed' ? 'bg-red-500/15 text-red-400' :
              'bg-white/[0.04] text-white/25'
            }`}>
              {match.status === 'pending' && <Clock size={10} />}
              {match.status === 'completed' && <Check size={10} />}
              {match.status === 'disputed' && <AlertTriangle size={10} />}
              {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-xl text-white">{me.username}</p>
              <p className="text-white/30 text-xs mt-0.5">You</p>
            </div>
            <span className="text-lg font-bold text-white/20 px-4">VS</span>
            <div className="flex-1 text-right">
              <p className="font-bold text-xl text-white">{opponent.username}</p>
              <p className="text-white/30 text-xs mt-0.5">Opponent</p>
            </div>
          </div>
        </div>

        {/* Opponent connect */}
        <div className="card p-5 mb-4">
          <h3 className="font-semibold text-white text-sm mb-3">Connect with Opponent</h3>
          {displayPlatform ? (
            <>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl mt-0.5">{PLATFORMS[displayPlatform]?.icon}</span>
                <div className="flex-1">
                  <p className="text-xs text-white/30">Playing {game?.label} on {PLATFORMS[displayPlatform]?.label}</p>
                  <p className="font-semibold text-white text-sm mt-0.5">
                    {PLATFORMS[displayPlatform]?.idLabel}: <span className="text-emerald-400">{opponentPlatformId}</span>
                  </p>
                </div>
              </div>
              {platformAddUrl && (
                <a href={platformAddUrl} target="_blank" rel="noopener noreferrer" className="btn-outline w-full text-sm">
                  <ExternalLink size={14} /> Add on {PLATFORMS[displayPlatform]?.label}
                </a>
              )}
            </>
          ) : <p className="text-center py-4 text-white/20 text-sm">Platform info not available</p>}
          <div className="mt-3 pt-3 border-t border-white/[0.04]">
            <p className="text-xs text-white/20 mb-2">Opponent&apos;s platforms</p>
            <div className="flex flex-wrap gap-2">
              {opponent.platforms.map((p) => <PlatformBadge key={p} platform={p} platformId={opponent.game_ids?.[p]} size="sm" />)}
            </div>
          </div>
        </div>

        {/* Report result */}
        {match.status === 'pending' && (
          <div className="card p-5 mb-4">
            <h3 className="font-semibold text-white text-sm mb-1">Report Result</h3>
            <p className="text-xs text-white/30 mb-4">Both players must agree on the result.</p>
            {myReport ? (
              <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-3 mb-3">
                <p className="text-emerald-400 text-sm font-medium">
                  You reported: <strong>{myReport === user.id ? 'You won' : `${opponent.username} won`}</strong>
                </p>
                {!opponentReport && <p className="text-white/30 text-xs mt-1">Waiting for opponent...</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleReport(user.id)} disabled={!!reporting} className="btn-primary flex flex-col items-center py-4 gap-1">
                  <Check size={18} /><span className="text-sm">I Won</span>
                </button>
                <button onClick={() => handleReport(opponent.id)} disabled={!!reporting} className="btn-outline flex flex-col items-center py-4 gap-1">
                  <X size={18} /><span className="text-sm">{opponent.username} Won</span>
                </button>
              </div>
            )}
            <button onClick={handleCancel} disabled={cancelling} className="w-full btn-danger mt-3 text-sm">
              {cancelling ? 'Cancelling...' : 'Cancel Match'}
            </button>
          </div>
        )}

        {/* Disputed */}
        {match.status === 'disputed' && (
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-red-400" />
              <h3 className="font-semibold text-white text-sm">Match Disputed</h3>
            </div>
            <p className="text-sm text-white/30 mb-4">Upload a screenshot of the result to resolve.</p>
            {match.dispute_screenshot_url ? (
              <div className="mb-4">
                <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.06]">
                  <Image src={match.dispute_screenshot_url} alt="Dispute screenshot" fill className="object-contain" />
                </div>
                <p className="text-xs text-emerald-400 mt-2 font-medium text-center">Under Review — Admin will resolve within 24 hours</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/[0.08] rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500/30 transition-colors mb-3"
                onClick={() => fileInputRef.current?.click()}>
                <ImageIcon size={24} className="text-white/15 mx-auto mb-2" />
                <p className="text-sm font-medium text-white/30">Click to upload screenshot</p>
                <p className="text-xs text-white/15 mt-1">PNG, JPG, WEBP up to 10MB</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScreenshotUpload} className="hidden" />
            {!match.dispute_screenshot_url && (
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingScreenshot} className="w-full btn-primary">
                <Upload size={14} /> {uploadingScreenshot ? 'Uploading...' : 'Upload Screenshot'}
              </button>
            )}
          </div>
        )}

        {/* Completed */}
        {match.status === 'completed' && (
          <div className={`card p-6 mb-4 text-center ${iWon ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : ''}`}>
            <div className="text-4xl mb-2">{iWon ? '🏆' : '😔'}</div>
            <h3 className="font-bold text-xl text-white mb-1">{iWon ? 'Victory!' : 'Defeat'}</h3>
            {myRatingChange !== null && (
              <p className={`text-lg font-bold ${myRatingChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {myRatingChange >= 0 ? '+' : ''}{myRatingChange} rating
              </p>
            )}
            {match.winner_id && (
              <p className="text-sm text-white/30 mt-1">
                Winner: <strong className="text-white">{match.winner_id === user.id ? 'You' : opponent.username}</strong>
              </p>
            )}
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4">Play Again</button>
          </div>
        )}

        {/* Match info */}
        <div className="card p-5">
          <h3 className="text-xs font-medium text-white/20 uppercase tracking-wide mb-3">Match Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-white/20 mb-1">Your Rating</p>
              <RatingBadge rating={(user as unknown as Record<string, unknown>)[`rating_${match.game}`] as number ?? 1000} size="sm" />
            </div>
            <div className="text-center">
              <p className="text-xs text-white/20 mb-1">Game Mode</p>
              <span className="badge-emerald text-xs">{game?.mode}</span>
            </div>
          </div>
          <p className="text-xs text-white/15 text-center mt-3">Started {new Date(match.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
