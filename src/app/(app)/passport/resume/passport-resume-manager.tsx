'use client';

import { useEffect, useState } from 'react';
import { useAuthFetch } from '@/components/AuthProvider';
import { PassportResumeView } from '@/components/PassportResumeView';
import type { PassportOwnerCompetitiveResume } from '@/lib/passport-resume-types';

export function PassportResumeManager() {
  const authFetch = useAuthFetch();
  const [resume, setResume] = useState<PassportOwnerCompetitiveResume | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { authFetch('/api/passport/resume/me').then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); return payload.resume; }).then(setResume).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load Gamer Resume')); }, [authFetch]);
  if (error) return <div className="p-12 text-center text-white/55">{error}</div>;
  return resume ? <PassportResumeView resume={resume} owner /> : <div className="p-12 text-center text-white/45">Building your verified resume…</div>;
}
