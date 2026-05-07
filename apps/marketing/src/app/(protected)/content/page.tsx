import { ContentClient } from "@/components/marketing/content-client";
import { getContentPageData } from "@/lib/queries";

type ContentPageProps = {
  searchParams: Promise<{ view?: string; focus?: string }>;
};

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const { view, focus } = await searchParams;
  const data = await getContentPageData();
  return <ContentClient initialData={data} initialView={view} focus={focus ?? null} />;
}
