import type { PassportPublicCompetitiveResume } from '@/lib/passport-resume-types';

type PublicResumeRouteContext = {
  params: Promise<{ username: string }>;
};

type PublicResumeRouteDependencies = {
  normalizeUsername: (value: string) => string;
  loadResume: (username: string) => Promise<PassportPublicCompetitiveResume | null>;
};

export function createPublicPassportResumeHandler(
  dependencies: PublicResumeRouteDependencies
) {
  return async function GET(
    _request: Request,
    { params }: PublicResumeRouteContext
  ): Promise<Response> {
    const username = dependencies.normalizeUsername((await params).username);
    const resume = await dependencies.loadResume(username);
    return resume
      ? Response.json(
          { resume },
          {
            headers: {
              'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
            },
          }
        )
      : Response.json({ error: 'Gamer Resume not found' }, { status: 404 });
  };
}
