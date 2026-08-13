import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PassportComparisonView } from '@/components/PassportComparisonView';
import { getPassportComparison } from '@/lib/passport-comparison';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ left: string; right: string }>; searchParams: Promise<{ invite?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { left, right } = await params;
  const title = `@${left} vs @${right} | Mechi Gamer Passport`;
  const description = 'Compare visible gaming libraries and verified PlayMechi rivalry records.';
  const image = `/api/passport/comparison-cards/${encodeURIComponent(left)}/${encodeURIComponent(right)}`;
  return { title, description, openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] }, twitter: { card: 'summary_large_image', title, description, images: [image] } };
}
export default async function PublicPassportComparisonPage({ params, searchParams }: Props) {
  const { left, right } = await params;
  const invitationToken = (await searchParams).invite;
  const result = await getPassportComparison(left, right);
  if (!result.data) notFound();
  return <div className="min-h-screen bg-[linear-gradient(180deg,#071018,#0d1724)] text-white"><PassportComparisonView initialComparison={result.data} invitationToken={invitationToken} /></div>;
}
