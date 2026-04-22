import { TournamentsClient } from "@/components/marketing/tournaments-client";
import { getTournamentsPageData } from "@/lib/queries";

export default async function TournamentsPage() {
  const data = await getTournamentsPageData();
  return <TournamentsClient initialData={data} />;
}
