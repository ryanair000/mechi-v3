import { BountiesClient } from "@/components/marketing/bounties-client";
import { getBountiesPageData } from "@/lib/queries";

type BountiesPageProps = {
  searchParams: Promise<{ status?: string; week?: string }>;
};

export default async function BountiesPage({ searchParams }: BountiesPageProps) {
  const { status, week } = await searchParams;
  const data = await getBountiesPageData();
  return <BountiesClient initialData={data} initialStatus={status} initialWeek={week} />;
}
