import { notFound } from 'next/navigation';
import { TeamPassportView } from '@/components/TeamPassportView';
import { getTeamPassport } from '@/lib/passport-community';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const team = await getTeamPassport((await params).slug); return team ? { title: `${team.name} Team Passport | Mechi V5`, description: team.recruitment_headline || team.description || `${team.name} verified gaming team`, openGraph: { images: [`/api/teams/cards/${team.slug}`] }, twitter: { card: 'summary_large_image' as const, images: [`/api/teams/cards/${team.slug}`] } } : { title: 'Team Passport Not Found | Mechi' }; }
export default async function PublicTeamPassportPage({ params }: { params: Promise<{ slug: string }> }) { const team = await getTeamPassport((await params).slug); if (!team) notFound(); return <TeamPassportView team={team} />; }
