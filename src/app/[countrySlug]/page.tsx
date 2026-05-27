import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MechiHomePageShell } from '@/app/home/mechi-home-page';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import {
  AFRICAN_COUNTRY_KEYS,
  getCountryBySlug,
  getCountryLabel,
  getCountrySlug,
} from '@/lib/location';
import { buildRegionalSettings } from '@/lib/regional-settings';
import { WEEKEND_CUP_TITLE } from '@/lib/weekend-cup';

type CountrySlugPageProps = {
  params: Promise<{ countrySlug: string }>;
};

export function generateStaticParams() {
  return AFRICAN_COUNTRY_KEYS.map((country) => ({
    countrySlug: getCountrySlug(country),
  }));
}

export async function generateMetadata({
  params,
}: CountrySlugPageProps): Promise<Metadata> {
  const { countrySlug } = await params;
  const country = getCountryBySlug(countrySlug);

  if (!country) {
    return {};
  }

  const countryLabel = getCountryLabel(country);
  return {
    title: `${countryLabel} | Mechi.club`,
    description: `Mechi.club ${countryLabel} home for ${WEEKEND_CUP_TITLE}, tournaments, lobbies, rewards, and African gaming community runs.`,
    alternates: {
      canonical: `/${countrySlug}`,
    },
  };
}

export default async function CountrySlugPage({ params }: CountrySlugPageProps) {
  const { countrySlug } = await params;
  const country = getCountryBySlug(countrySlug);

  if (!country) {
    notFound();
  }

  return (
    <RegionalSettingsProvider initialSettings={buildRegionalSettings(country, 'manual')}>
      <MechiHomePageShell />
    </RegionalSettingsProvider>
  );
}
