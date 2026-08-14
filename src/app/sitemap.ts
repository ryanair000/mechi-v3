import type { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase';
import { APP_URL } from '@/lib/urls';
import { WEEKEND_CUP_GAMES } from '@/lib/weekend-cup';

export const dynamic = 'force-dynamic';

function url(path: string) {
  return `${APP_URL}${path}`;
}

function entry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number
): MetadataRoute.Sitemap[number] {
  return {
    url: url(path),
    changeFrequency,
    priority,
  };
}

async function discoverablePassports(): Promise<MetadataRoute.Sitemap> {
  const { data, error } = await createServiceClient()
    .from('passport_profiles')
    .select('public_handle, updated_at, profile:profiles!inner(age_policy_status)')
    .eq('publication_status', 'published')
    .eq('is_discoverable', true)
    .eq('default_visibility', 'public')
    .not('public_handle', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(49_000);
  if (error) {
    console.warn('[Passport Sitemap]', JSON.stringify({ error_class: error.code ?? 'storage_error' }));
    return [];
  }
  return (data ?? []).flatMap((row) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    const handle = String(row.public_handle ?? '').toLowerCase();
    if (profile?.age_policy_status === 'minor' || !/^[a-z0-9][a-z0-9_-]{2,29}$/.test(handle)) return [];
    return [{
      url: url(`/p/@${encodeURIComponent(handle)}`),
      lastModified: String(row.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.55,
    }];
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const passportEntries = await discoverablePassports();
  return [
    entry('/', 'weekly', 1),
    entry('/ke', 'weekly', 0.9),
    entry('/tz', 'weekly', 0.8),
    entry('/ug', 'weekly', 0.8),
    entry('/weekendcup', 'daily', 1),
    entry('/weekendcup/register', 'daily', 0.95),
    ...WEEKEND_CUP_GAMES.map((game) =>
      entry(`/weekendcup/t/${game.game}`, 'daily', 0.9)
    ),
    entry('/tournaments', 'daily', 0.9),
    entry('/playmechi/tournaments', 'daily', 0.95),
    entry('/pricing', 'weekly', 0.7),
    entry('/how-mechi-works', 'monthly', 0.75),
    entry('/support', 'monthly', 0.7),
    entry('/playmechi', 'monthly', 0.45),
    entry('/playmechi/weka-mawe', 'weekly', 0.55),
    entry('/privacy-policy', 'yearly', 0.3),
    entry('/terms-of-service', 'yearly', 0.3),
    entry('/user-data-deletion', 'yearly', 0.3),
    ...passportEntries,
  ];
}
