import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Clock3,
  ExternalLink,
  Pin,
  type LucideIcon,
} from 'lucide-react';
import type { ButtonProps } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type FeedPostMetric = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export type FeedPostAction = {
  href: string;
  label: string;
  external?: boolean;
  variant?: ButtonProps['variant'];
};

export interface FeedPostProps {
  author: string;
  channel: string;
  publishedAt: string;
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  primaryAction?: FeedPostAction;
  secondaryAction?: FeedPostAction;
  metrics?: FeedPostMetric[];
  tags?: string[];
  pinned?: boolean;
  priority?: boolean;
  className?: string;
}

function FeedPostActionButton({ action }: { action: FeedPostAction }) {
  const content = (
    <>
      {action.label}
      {action.external ? <ExternalLink size={14} /> : <ArrowRight size={14} />}
    </>
  );

  if (action.external) {
    return (
      <Button asChild size="sm" variant={action.variant ?? 'default'}>
        <a href={action.href} rel="noreferrer" target="_blank">
          {content}
        </a>
      </Button>
    );
  }

  return (
    <Button asChild size="sm" variant={action.variant ?? 'default'}>
      <Link href={action.href}>{content}</Link>
    </Button>
  );
}

export function FeedPost({
  author,
  channel,
  publishedAt,
  title,
  body,
  imageSrc,
  imageAlt,
  primaryAction,
  secondaryAction,
  metrics = [],
  tags = [],
  pinned = false,
  priority = false,
  className,
}: FeedPostProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden border-[rgba(50,224,196,0.14)] bg-[color-mix(in_srgb,var(--surface-strong)_95%,transparent)]',
        className
      )}
    >
      <div className="flex items-start gap-3 border-b border-[var(--border-color)] px-4 py-4 sm:px-5">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[rgba(50,224,196,0.18)] bg-[linear-gradient(180deg,rgba(50,224,196,0.14),rgba(255,107,107,0.14))]">
          <Image
            src="/mechi-logo-shield.png"
            alt={`${author} logo`}
            fill
            sizes="48px"
            className="object-contain p-2.5"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-[var(--text-primary)]">{author}</p>
            <span className="brand-chip">{channel}</span>
            {pinned ? (
              <span className="brand-chip-coral">
                <Pin size={12} />
                Pinned
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={12} />
              {publishedAt}
            </span>
            <span>PlayMechi official feed</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(var(--radius-panel)-0.2rem)] border border-[var(--border-color)] bg-[var(--surface-elevated)] sm:aspect-[16/11]">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 42rem, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_10%,rgba(11,17,33,0.08)_52%,rgba(11,17,33,0.82)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 p-3 sm:p-4">
            {tags.map((tag) => (
              <span key={tag} className="brand-chip border-white/10 bg-black/28 text-white">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black leading-tight text-[var(--text-primary)] sm:text-[2rem]">
            {title}
          </h2>
          <p className="whitespace-pre-line text-sm leading-7 text-[var(--text-secondary)] sm:text-[0.98rem]">
            {body}
          </p>
        </div>

        {metrics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <div
                  key={`${metric.label}-${metric.value}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-left"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]">
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                      {metric.label}
                    </span>
                    <span className="block text-sm font-bold text-[var(--text-primary)]">
                      {metric.value}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {primaryAction || secondaryAction ? (
          <div className="flex flex-wrap gap-2">
            {primaryAction ? <FeedPostActionButton action={primaryAction} /> : null}
            {secondaryAction ? <FeedPostActionButton action={secondaryAction} /> : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
