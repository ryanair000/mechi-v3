import { getRankDivision, withAlpha } from '@/lib/gamification';

interface RatingBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showRating?: boolean;
}

export function RatingBadge({
  rating,
  size = 'md',
  showRating = true,
}: RatingBadgeProps) {
  const division = getRankDivision(rating);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold ${sizeClasses[size]}`}
      style={{
        color: division.color,
        backgroundColor: withAlpha(division.color, '14'),
        borderColor: withAlpha(division.color, '30'),
      }}
    >
      {showRating ? division.label : division.tier}
    </span>
  );
}
