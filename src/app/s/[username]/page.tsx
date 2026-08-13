import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { getPublicProfileData } from '@/lib/public-profile';
import { getPassportPath } from '@/lib/passport';

type ShareProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: ShareProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileData(username);
  return {
    title: profile ? `${profile.username} | Player Profile` : 'Player Profile',
  };
}

export default async function ShareProfilePage({ params }: ShareProfilePageProps) {
  const { username } = await params;
  permanentRedirect(getPassportPath(username));
}
