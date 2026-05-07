import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CtaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle: React.ReactNode;
  description: string;
  buttonText: string;
  buttonHref?: string;
  buttonTarget?: React.HTMLAttributeAnchorTarget;
  onButtonClick?: () => void;
}

const CtaCard = React.forwardRef<HTMLDivElement, CtaCardProps>(
  (
    {
      className,
      imageSrc,
      imageAlt,
      title,
      subtitle,
      description,
      buttonText,
      buttonHref,
      buttonTarget,
      onButtonClick,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden rounded-[var(--radius-card)] border bg-card text-card-foreground shadow',
          'flex flex-col md:flex-row',
          className
        )}
        {...props}
      >
        <div className="relative h-56 w-full md:h-auto md:min-h-80 md:w-1/3">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex w-full flex-col justify-center p-6 md:w-2/3 md:p-8">
          <div>
            <p className="text-sm font-semibold text-primary">{title}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{subtitle}</h2>
            <p className="mt-4 text-muted-foreground">{description}</p>
            <div className="mt-6">
              {buttonHref ? (
                <Button asChild size="lg" onClick={onButtonClick}>
                  <a href={buttonHref} target={buttonTarget} rel={buttonTarget === '_blank' ? 'noopener noreferrer' : undefined}>
                    {buttonText}
                  </a>
                </Button>
              ) : (
                <Button size="lg" onClick={onButtonClick}>
                  {buttonText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
CtaCard.displayName = 'CtaCard';

export { CtaCard };
