import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  getPassportPath,
  resolvePublicPassportHandleForAccountUsername,
} from '@/lib/passport';

type ShareProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: ShareProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const handle = await resolvePublicPassportHandleForAccountUsername(username);
  return {
    title: handle ? `@${handle} | Player Profile` : 'Player Profile',
    robots: handle ? undefined : { index: false, follow: false },
  };
}

export default async function ShareProfilePage({ params }: ShareProfilePageProps) {
  const { username } = await params;
  const handle = await resolvePublicPassportHandleForAccountUsername(username);
  if (!handle) notFound();
  permanentRedirect(getPassportPath(handle));
}
