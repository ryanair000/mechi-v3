'use client';

import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface ThemeToggleProps {
  variant?: 'icon' | 'pill';
}

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={variant === 'pill' ? 'theme-toggle' : 'theme-toggle h-8 w-8 p-0'}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      {isDark ? <SunMedium size={16} /> : <Moon size={16} />}
      {variant === 'pill' && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
