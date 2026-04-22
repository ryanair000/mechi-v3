import { MarketingShell } from "@/components/marketing/shell";
import { getNavigationWeeks } from "@/lib/queries";
import { requirePageSession } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageSession();
  const navigation = await getNavigationWeeks();

  return (
    <MarketingShell
      weeks={navigation.weeks}
      currentWeekNumber={navigation.currentWeekNumber}
    >
      {children}
    </MarketingShell>
  );
}
