import { permanentRedirect } from 'next/navigation';
import { getPassportPath } from '@/lib/passport';

type Props = {
  params: Promise<{ username: string }>;
};

export default async function LegacyShareProfilePage({ params }: Props) {
  const { username } = await params;
  permanentRedirect(getPassportPath(username));
}
