import { PassportComparisonView } from '@/components/PassportComparisonView';

export default async function ComparePlayerPage({ params }: { params: Promise<{ username: string }> }) {
  return <PassportComparisonView username={(await params).username} />;
}
