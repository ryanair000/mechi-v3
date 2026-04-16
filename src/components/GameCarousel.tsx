'use client';

import { useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { GameCover } from '@/components/GameCover';
import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';

const FEATURED_GAMES: GameKey[] = [
  'efootball',
  'fc26',
  'tekken8',
  'sf6',
  'nba2k26',
  'mk11',
  'cs2',
  'valorant',
  'rocketleague',
  'codm',
  'pubgm',
  'freefire',
  'ludo',
];

export function GameCarousel() {
  const autoplay = useRef(Autoplay({ delay: 2800, stopOnInteraction: false }));
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'start', slidesToScroll: 1 }, [autoplay.current]);

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex gap-3">
        {FEATURED_GAMES.map((gameKey) => {
          const game = GAMES[gameKey];

          return (
            <div key={gameKey} className="w-[200px] flex-shrink-0 sm:w-[220px]">
              <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
                <GameCover gameKey={gameKey} variant="header" className="w-full aspect-[460/215]" overlay />
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="truncate text-xs font-semibold text-white drop-shadow-md">{game.label}</p>
                  <p className="mt-0.5 text-[10px] text-white/50">
                    {game.platforms.slice(0, 3).join(' / ').toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
