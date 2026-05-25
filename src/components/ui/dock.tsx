'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface DockItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}

interface DockProps {
  className?: string;
  items: DockItem[];
  activeLabel?: string | null;
  ariaLabel?: string;
}

export default function Dock({
  items,
  className,
  activeLabel = null,
  ariaLabel = 'PlayMechi navigation',
}: DockProps) {
  const [active, setActive] = React.useState<string | null>(activeLabel);
  const [hovered, setHovered] = React.useState<number | null>(null);

  React.useEffect(() => {
    setActive(activeLabel);
  }, [activeLabel]);

  return (
    <nav aria-label={ariaLabel} className={cn('flex w-full items-center justify-center', className)}>
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
        className={cn(
          'flex items-end gap-2 rounded-[28px] border border-[rgba(50,224,196,0.22)] bg-[rgba(11,17,33,0.88)] px-3 py-2 shadow-[0_18px_55px_rgba(11,17,33,0.32)] backdrop-blur-2xl',
          'supports-[backdrop-filter]:bg-[rgba(11,17,33,0.72)]',
        )}
        style={{ transform: 'perspective(640px) rotateX(8deg)' }}
      >
        <TooltipProvider delayDuration={90}>
          {items.map((item, index) => {
            const isActive = active === item.label;
            const isHovered = hovered === index;

            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <motion.div
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(null)}
                    animate={{
                      scale: isHovered ? 1.16 : 1,
                      y: isHovered ? -5 : 0,
                      rotate: isHovered ? -3 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                    className="relative flex min-w-0 flex-col items-center"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'relative h-11 w-11 rounded-2xl border border-transparent bg-white/[0.03] text-white hover:border-[rgba(50,224,196,0.34)] hover:bg-[rgba(50,224,196,0.12)] hover:text-white',
                        isActive &&
                          'border-[rgba(50,224,196,0.48)] bg-[rgba(50,224,196,0.16)] text-[var(--accent-secondary-text)]',
                        isHovered && 'shadow-[0_12px_34px_rgba(50,224,196,0.22)]',
                      )}
                      onClick={() => {
                        setActive(item.label);
                        item.onClick?.();
                      }}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 transition-colors',
                          isActive ? 'text-[var(--accent-secondary-text)]' : 'text-white',
                        )}
                      />
                      {isHovered ? (
                        <motion.span
                          layoutId="playmechi-dock-glow"
                          className="absolute inset-0 rounded-2xl border border-[rgba(50,224,196,0.5)]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      ) : null}
                    </Button>

                    {isActive ? (
                      <motion.div
                        layoutId="playmechi-dock-dot"
                        className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--accent-secondary-text)]"
                      />
                    ) : (
                      <span className="mt-1 h-1.5 w-1.5" aria-hidden="true" />
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </motion.div>
    </nav>
  );
}
