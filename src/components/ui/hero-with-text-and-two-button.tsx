import Link from 'next/link';
import { MoveRight, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Hero1Props {
  badgeLabel?: string;
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

function Hero1({
  badgeLabel = 'Free entry. KSh 6K prize pool.',
  title = 'Pull up. Lock in. Win on Mechi.',
  description = 'PUBG Mobile, CODM, and eFootball are going online for three nights. Register on Mechi, show up at 8 PM EAT, and let the scoreboard do the talking.',
  primaryLabel = 'Secure my slot',
  primaryHref = '#register',
  secondaryLabel = 'See games and prizes',
  secondaryHref = '#games-prizes',
}: Hero1Props) {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-center gap-4 py-6 text-center sm:py-7 lg:py-8">
          <div>
            <Button variant="secondary" size="sm" className="gap-3">
              {badgeLabel}
              <MoveRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex max-w-3xl flex-col gap-3">
            <h1 className="text-[2.05rem] font-black leading-[1.02] tracking-normal text-[var(--text-primary)] sm:text-4xl md:text-[2.75rem]">
              {title}
            </h1>
            {description ? (
              <p className="mx-auto max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" variant="outline" className="gap-3">
              <Link href={secondaryHref}>
                {secondaryLabel}
                <Trophy className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" className="gap-3">
              <Link href={primaryHref}>
                {primaryLabel}
                <MoveRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero1 };
