import { OverviewClient } from "@/components/marketing/overview-client";
import { getOverviewData } from "@/lib/queries";

export default async function OverviewPage() {
  const data = await getOverviewData();
  return <OverviewClient initialData={data} />;
}
