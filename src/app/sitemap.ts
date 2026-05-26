import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/urls';
import { WEEKEND_CUP_GAMES } from '@/lib/weekend-cup';

const now = new Date();

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
    lastModified: now,
    changeFrequency,
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
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
    entry('/pricing', 'weekly', 0.7),
    entry('/how-mechi-works', 'monthly', 0.75),
    entry('/support', 'monthly', 0.7),
    entry('/playmechi', 'monthly', 0.45),
    entry('/playmechi/weka-mawe', 'weekly', 0.55),
    entry('/privacy-policy', 'yearly', 0.3),
    entry('/terms-of-service', 'yearly', 0.3),
    entry('/user-data-deletion', 'yearly', 0.3),
  ];
}
