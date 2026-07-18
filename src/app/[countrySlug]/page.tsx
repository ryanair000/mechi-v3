import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RegionalSettingsProvider } from '@/components/RegionalSettingsProvider';
import { V5HomePage } from '@/components/v5/V5Public';
import {
  AFRICAN_COUNTRY_KEYS,
  getCountryBySlug,
  getCountryLabel,
  getCountrySlug,
} from '@/lib/location';
import { buildRegionalSettings } from '@/lib/regional-settings';

export const dynamic = 'force-dynamic';

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
    description: `Find approved tournaments, organizers, rankings, and competitive gaming communities in ${countryLabel}.`,
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
      <V5HomePage country={country} />
    </RegionalSettingsProvider>
  );
}
