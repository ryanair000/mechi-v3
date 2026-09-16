'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getLoginPath } from '@/lib/navigation';

export function V5TournamentJoinLink({ slug, className }: { slug: string; className?: string }) {
  const { user } = useAuth();
  const tournamentPath = `/app/player/tournaments?join=${encodeURIComponent(slug)}`;
  const href = user ? tournamentPath : getLoginPath(tournamentPath);

  return (
    <Link className={className} href={href}>
      Join tournament <ArrowRight size={17} />
    </Link>
  );
}
