import { AdsClient } from "@/components/marketing/ads-client";
import { getAdsPageData } from "@/lib/queries";

type AdsPageProps = {
  searchParams: Promise<{ focus?: string }>;
};

export default async function AdsPage({ searchParams }: AdsPageProps) {
  const { focus } = await searchParams;
  const data = await getAdsPageData();
  return <AdsClient initialData={data} focus={focus ?? null} />;
}
