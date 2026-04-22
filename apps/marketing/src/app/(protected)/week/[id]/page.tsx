import { notFound } from "next/navigation";
import { WeekDetailClient } from "@/components/marketing/week-detail-client";
import { getWeekDetailData } from "@/lib/queries";

type WeekPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ focus?: string }>;
};

export default async function WeekDetailPage({ params, searchParams }: WeekPageProps) {
  const { id } = await params;
  const { focus } = await searchParams;
  const data = await getWeekDetailData(id);

  if (!data) {
    notFound();
  }

  return <WeekDetailClient initialData={data} focus={focus ?? null} />;
}
