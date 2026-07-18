import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { V5_SCREEN_CATALOG, getV5Screen } from '@/components/v5/v5-screen-catalog';
import { V5ScreenPage } from '@/components/v5/V5Public';

type Props = { params: Promise<{ screen: string[] }> };

export function generateStaticParams() {
  return V5_SCREEN_CATALOG.map((definition) => ({ screen: definition.slug.split('/') }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { screen } = await params;
  const definition = getV5Screen(screen.join('/'));
  return definition
    ? { title: `${definition.title} | Mechi V5`, description: definition.description }
    : { title: 'Page not found | Mechi V5' };
}

export default async function Page({ params }: Props) {
  const { screen } = await params;
  const definition = getV5Screen(screen.join('/'));
  if (!definition) notFound();
  return <V5ScreenPage definition={definition} />;
}
