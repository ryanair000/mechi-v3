'use client';

import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface ThemeToggleProps {
  variant?: 'icon' | 'pill';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';
  const buttonClassName = [
    variant === 'pill' ? 'theme-toggle' : 'theme-toggle h-8 w-8 p-0',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={buttonClassName}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      {isDark ? <SunMedium size={16} /> : <Moon size={16} />}
      {variant === 'pill' && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
