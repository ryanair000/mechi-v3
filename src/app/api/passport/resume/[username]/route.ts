import { getPassportCompetitiveResume } from '@/lib/passport-resume';
import { normalizePassportUsername } from '@/lib/passport';
import { createPublicPassportResumeHandler } from '@/lib/passport-resume-public-route';

export const GET = createPublicPassportResumeHandler({
  normalizeUsername: normalizePassportUsername,
  loadResume: getPassportCompetitiveResume,
});
