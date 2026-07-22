import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlayMechiWorkspace } from '@/components/playmechi/PlayMechiWorkspace';
import { PLAYMECHI_SCREEN_MAP, PLAYMECHI_SCREENS } from '@/components/playmechi/screen-definitions';

type ScreenPageProps = {
  params: Promise<{ screen: string }>;
};

export function generateStaticParams() {
  return PLAYMECHI_SCREENS.map((screen) => ({ screen: screen.slug }));
}

export async function generateMetadata({ params }: ScreenPageProps): Promise<Metadata> {
  const { screen: slug } = await params;
  const screen = PLAYMECHI_SCREEN_MAP.get(slug);
  if (!screen) return {};
  return {
    title: `${screen.title} | PlayMechi`,
    description: screen.description,
  };
}

export default async function PlayMechiScreenPage({ params }: ScreenPageProps) {
  const { screen: slug } = await params;
  const screen = PLAYMECHI_SCREEN_MAP.get(slug);
  if (!screen) notFound();
  return <PlayMechiWorkspace screen={screen} />;
}
