'use client';

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CountryKey } from '@/types';
import type { RegionalSettings } from '@/lib/regional-settings';

type RegionalSettingsContextValue = RegionalSettings & {
  isUpdatingCountry: boolean;
  setCountryPreference: (country: CountryKey | null) => Promise<void>;
};

const RegionalSettingsContext = createContext<RegionalSettingsContextValue | null>(null);

export function RegionalSettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings: RegionalSettings;
}) {
  const router = useRouter();
  const [isUpdatingCountry, startTransition] = useTransition();
  const [settings, setSettings] = useState<RegionalSettings>(initialSettings);

  const setCountryPreference = useCallback(
    async (country: CountryKey | null) => {
      const response = await fetch('/api/preferences/country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      });

      if (!response.ok) {
        throw new Error('Could not update country preference');
      }

      const payload = (await response.json()) as { settings?: RegionalSettings };
      if (!payload.settings) {
        throw new Error('Country preference response was incomplete');
      }

      setSettings(payload.settings);
      startTransition(() => {
        router.refresh();
      });
    },
    [router]
  );

  const contextValue = useMemo<RegionalSettingsContextValue>(
    () => ({
      ...settings,
      isUpdatingCountry,
      setCountryPreference,
    }),
    [isUpdatingCountry, setCountryPreference, settings]
  );

  return (
    <RegionalSettingsContext.Provider value={contextValue}>
      {children}
    </RegionalSettingsContext.Provider>
  );
}

export function useRegionalSettings() {
  const context = useContext(RegionalSettingsContext);

  if (!context) {
    throw new Error('useRegionalSettings must be used within RegionalSettingsProvider');
  }

  return context;
}
