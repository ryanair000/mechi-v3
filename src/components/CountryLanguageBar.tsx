'use client';

import { Globe2, Loader2, MapPinned, Sparkles } from 'lucide-react';
import { COUNTRY_OPTIONS } from '@/lib/location';
import { cn } from '@/lib/utils';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import type { CountryKey } from '@/types';

const AUTO_COUNTRY_VALUE = '__auto__';

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
    isExplicitPreference,
    isUpdatingCountry,
    languageLabel,
    locale,
    setCountryPreference,
  } = useRegionalSettings();
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
          value={isExplicitPreference ? country : AUTO_COUNTRY_VALUE}
          onChange={(event) => {
            const nextValue = event.target.value;
            void setCountryPreference(
              nextValue === AUTO_COUNTRY_VALUE ? null : (nextValue as CountryKey)
            ).catch(() => undefined);
          }}
          disabled={isUpdatingCountry}
          aria-label={isSwahili ? 'Badili nchi' : 'Switch country'}
          className="min-w-[8.5rem] appearance-none bg-transparent pr-5 text-[0.82rem] font-semibold text-[var(--text-primary)] outline-none"
        >
          <option value={AUTO_COUNTRY_VALUE}>
            {isSwahili ? 'Tambua moja kwa moja' : 'Auto detect'}
          </option>
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
