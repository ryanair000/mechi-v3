import { CommunityClient } from "@/components/marketing/community-client";
import { getCommunityPageData } from "@/lib/queries";

type CommunityPageProps = {
  searchParams: Promise<{ focus?: string }>;
};

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const { focus } = await searchParams;
  const data = await getCommunityPageData();
  return <CommunityClient initialData={data} focus={focus ?? null} />;
}
