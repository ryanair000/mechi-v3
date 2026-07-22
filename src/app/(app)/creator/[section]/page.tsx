import { notFound } from 'next/navigation';
import { CreatorStudio } from '@/components/dashboard/CreatorStudio';
import { isCreatorSection } from '@/lib/dashboard';

export default async function CreatorSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isCreatorSection(section)) notFound();
  return <CreatorStudio section={section} />;
}
