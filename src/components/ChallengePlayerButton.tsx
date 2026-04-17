'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Swords } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { emitNotificationRefresh } from '@/components/NotificationNavButton';
import type { GameKey, PlatformKey } from '@/types';

interface ChallengePlayerButtonProps {
  opponentId: string;
  opponentUsername: string;
  game: GameKey;
  platform: PlatformKey;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function ChallengePlayerButton({
  opponentId,
  opponentUsername,
  game,
  platform,
  label = 'Challenge',
  className = 'btn-outline',
  disabled = false,
}: ChallengePlayerButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [loading, setLoading] = useState(false);

  const handleChallenge = async () => {
    if (!user) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.push(`/login${next}`);
      return;
    }

    if (user.id === opponentId) {
      toast.error('You cannot challenge yourself');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/challenges', {
        method: 'POST',
        body: JSON.stringify({
          opponent_id: opponentId,
          game,
          platform,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not send challenge');
        return;
      }

      toast.success(`Challenge sent to ${opponentUsername}`);
      emitNotificationRefresh();
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleChallenge()}
      disabled={disabled || loading}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <Swords size={14} />
      {loading ? 'Sending...' : label}
    </button>
  );
}
