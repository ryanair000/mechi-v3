import { getTier } from '@/lib/config';

interface RatingBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showRating?: boolean;
}

export function RatingBadge({ rating, size = 'md', showRating = true }: RatingBadgeProps) {
  const tier = getTier(rating);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${sizeClasses[size]} ${tier.color} ${tier.bgColor}`}
    >
      {tier.name}
      {showRating && <span className="opacity-70 font-normal">·</span>}
      {showRating && <span>{rating}</span>}
    </span>
  );
}
