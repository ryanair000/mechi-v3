'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { BookOpen, Clock } from 'lucide-react';

interface GlassBlogCardStat {
  label: string;
  value: string;
}

interface GlassBlogCardProps {
  title?: string;
  excerpt?: string;
  image?: string | null;
  date?: string;
  readTime?: string;
  tags?: string[];
  actionLabel?: string;
  stats?: GlassBlogCardStat[];
  className?: string;
  onAction?: () => void;
}

const defaultPost = {
  title: 'The Future of UI Design',
  excerpt:
    'Exploring the latest trends in glassmorphism, 3D elements, and micro-interactions.',
  image:
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
  date: 'Dec 2, 2025',
  readTime: '5 min read',
  tags: ['Design', 'UI/UX'],
};

export function GlassBlogCard({
  title = defaultPost.title,
  excerpt = defaultPost.excerpt,
  image = defaultPost.image,
  date = defaultPost.date,
  readTime = defaultPost.readTime,
  tags = defaultPost.tags,
  actionLabel = 'Read Article',
  stats = [],
  className,
  onAction,
}: GlassBlogCardProps) {
  return (
    <motion.div
      initial={false}
      className={cn('w-full', className)}
    >
      <Card className="group relative h-full overflow-hidden border border-white/15 bg-[rgba(10,18,31,0.82)] p-0 shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-md transition-all duration-300 hover:border-[rgba(50,224,196,0.42)] hover:shadow-[rgba(50,224,196,0.12)]">
        <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-[linear-gradient(145deg,rgba(10,16,28,0.98),rgba(28,42,68,0.92))]">
          {image ? (
            <motion.img
              src={image}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div aria-label={title} className="h-full w-full" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,12,21,0.92)] via-[rgba(7,12,21,0.18)] to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-45" />

          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            {tags?.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="border border-white/10 bg-black/35 text-white backdrop-blur-sm hover:bg-black/55"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {onAction ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAction}
                className="flex items-center gap-2 rounded-full bg-[var(--brand-teal)] px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-[rgba(50,224,196,0.18)]"
              >
                <BookOpen className="h-4 w-4" />
                {actionLabel}
              </motion.button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="space-y-2">
            <h3 className="text-xl font-black leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-secondary-text)]">
              {title}
            </h3>
            <p className="line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
              {excerpt}
            </p>
          </div>

          {stats.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.map((stat) => (
                <div
                  key={`${stat.label}-${stat.value}`}
                  className="min-w-32 flex-1 rounded-xl border border-[var(--border-color)] bg-[rgba(255,255,255,0.035)] px-3 py-3"
                >
                  <p className="text-xs text-[var(--text-soft)]">{stat.label}</p>
                  <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">{date}</span>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-soft)]">
              <Clock className="h-3.5 w-3.5" />
              <span>{readTime}</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
