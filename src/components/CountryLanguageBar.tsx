'use client';

import { Globe2, Loader2, MapPinned, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { COUNTRY_OPTIONS } from '@/lib/location';
import { cn } from '@/lib/utils';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import type { CountryKey } from '@/types';

const COUNTRY_LANDING_PATHS: Partial<Record<CountryKey, string>> = {
  kenya: '/ke',
  tanzania: '/tz',
  uganda: '/ug',
  united_states: '/usa',
};

function getSourceLabel(countrySource: string, locale: string) {
  const isSwahili = locale === 'sw-TZ';

  switch (countrySource) {
    case 'manual':
      return isSwahili ? 'Chaguo lako' : 'Your choice';
    case 'player':
      return isSwahili ? 'Kutoka kwa akaunti' : 'From profile';
    case 'ip':
      return isSwahili ? 'Kutoka IP' : 'From IP';
    case 'accept-language':
      return isSwahili ? 'Kutoka lugha' : 'From browser';
    default:
      return isSwahili ? 'Chaguo msingi' : 'Default';
  }
}

export function CountryLanguageBar({
  className,
  inline = false,
}: {
  className?: string;
  inline?: boolean;
}) {
  const {
    country,
    countrySource,
    isUpdatingCountry,
    languageLabel,
    locale,
    setCountryPreference,
  } = useRegionalSettings();
  const router = useRouter();
  const isSwahili = locale === 'sw-TZ';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-[0.9rem] border border-[rgba(129,148,178,0.18)] bg-[rgba(17,27,46,0.9)] px-2.5 py-1.5 text-[var(--text-primary)] shadow-[0_12px_30px_rgba(2,8,23,0.28)] backdrop-blur-xl',
        inline ? 'w-full justify-between sm:w-auto' : 'w-fit',
        className
      )}
    >
      <div className="hidden items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)] sm:flex">
        <MapPinned size={12} />
        <span>{getSourceLabel(countrySource, locale)}</span>
      </div>

      <div className="relative flex min-w-0 items-center gap-2">
        <Globe2 size={13} className="shrink-0 text-[var(--accent-secondary-text)]" />
        <select
          value={country}
          onChange={(event) => {
            const nextCountry = event.target.value as CountryKey;
            void setCountryPreference(nextCountry)
              .then(() => {
                router.push(COUNTRY_LANDING_PATHS[nextCountry] ?? '/');
              })
              .catch(() => undefined);
          }}
          disabled={isUpdatingCountry}
          aria-label={isSwahili ? 'Badili nchi' : 'Switch country'}
          className="min-w-[8.5rem] appearance-none bg-transparent pr-5 text-[0.82rem] font-semibold text-[var(--text-primary)] outline-none"
        >
          {COUNTRY_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        {isUpdatingCountry ? (
          <Loader2 size={13} className="absolute right-0 animate-spin text-[var(--accent-secondary-text)]" />
        ) : null}
      </div>

      <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
        <Sparkles size={11} />
        {languageLabel}
      </span>
    </div>
  );
}
