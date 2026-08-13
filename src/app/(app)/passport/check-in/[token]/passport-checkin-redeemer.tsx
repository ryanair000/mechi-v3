'use client';

import { CheckCircle2, QrCode, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useAuthFetch } from '@/components/AuthProvider';

export function PassportCheckinRedeemer({ token }: { token: string }) {
  const authFetch = useAuthFetch();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const redeem = async () => { setBusy(true); try { const response = await authFetch(`/api/passport/check-in/${encodeURIComponent(token)}`, { method: 'POST' }); const payload = await response.json(); setOutcome(payload.outcome ?? 'invalid'); } finally { setBusy(false); } };
  const accepted = outcome === 'accepted';
  return <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4"><div className="w-full rounded-[2rem] border border-white/10 bg-white/[.035] p-7 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#32E0C4]/10 text-[#32E0C4]">{accepted ? <CheckCircle2 size={32} /> : outcome ? <ShieldAlert size={32} /> : <QrCode size={32} />}</div><h1 className="mt-5 text-3xl font-black text-white">{accepted ? 'Check-in verified' : outcome ? `Check-in ${outcome}` : 'Confirm event check-in'}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/45">{accepted ? 'Your verified check-in stamp is now part of your Event Passport.' : outcome ? 'This pass cannot be used. Ask the organizer if you believe this is an error.' : 'This pass is bound to your Mechi account and can only be redeemed once.'}</p>{!outcome ? <button type="button" disabled={busy} onClick={redeem} className="btn-primary mt-6">{busy ? 'Verifying…' : 'Verify my check-in'}</button> : null}</div></main>;
}
