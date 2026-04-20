'use client';

import { Puzzle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AnimatedNumberCountdown from '@/components/ui/countdown-number';

type CountdownSnapshot = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

type LandingCountdownSectionProps = {
  closesAt: string;
  closesLabel: string;
  playerCap: number;
  registeredPlayers: number;
  initialSnapshot: CountdownSnapshot;
};

export function LandingCountdownSection({ closesAt }: LandingCountdownSectionProps) {
  return (
    <section className="landing-section pt-0">
      <div className="landing-shell">
        <div className="flex flex-col items-center justify-center">
          <Badge
            variant="outline"
            className="rounded-[14px] border border-black/10 text-base text-neutral-800 md:left-6"
          >
            <Puzzle className="fill-[#D2F583] stroke-1 text-neutral-800" /> &nbsp;
            CountDown component
          </Badge>
          <AnimatedNumberCountdown
            endDate={new Date(closesAt)}
            className="my-4"
          />
        </div>
      </div>
    </section>
  );
}
