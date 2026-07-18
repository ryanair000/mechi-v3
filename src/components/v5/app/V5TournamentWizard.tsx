'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CircleAlert, Gamepad2, ShieldCheck, Trophy, UsersRound } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS } from '@/lib/config';
import { getTournamentApprovalClassification } from '@/lib/tournament-policy';
import type { GameKey, PlatformKey } from '@/types';
import styles from './V5TournamentWizard.module.css';

type ParticipantType = 'solo' | 'team';
type TournamentDraft = {
  participantType: ParticipantType; teamSize: number; title: string; game: GameKey;
  platform: PlatformKey; size: 4 | 8 | 16; scheduledFor: string; rules: string;
  entryFee: number; prizePool: number; valuableRewardExists: boolean;
  sponsorFundedRewardExists: boolean; rewardDescription: string;
};

const AVAILABLE_GAMES = (Object.entries(GAMES) as Array<[GameKey, (typeof GAMES)[GameKey]]>)
  .filter(([, game]) => !game.hidden && game.mode === '1v1');
const INITIAL_DRAFT: TournamentDraft = {
  participantType: 'solo', teamSize: 2, title: '', game: 'efootball', platform: 'ps',
  size: 4, scheduledFor: '', rules: '', entryFee: 0, prizePool: 0,
  valuableRewardExists: false, sponsorFundedRewardExists: false, rewardDescription: '',
};
const STEP_LABELS = ['Format', 'Game & size', 'Schedule & rules', 'Entry & rewards', 'Review'];

export function V5TournamentWizard() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TournamentDraft>(INITIAL_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const platforms = GAMES[draft.game].platforms;
  const classification = useMemo(() => getTournamentApprovalClassification({
    entryFee: draft.entryFee,
    prizePool: draft.prizePool,
    prizePoolMode: draft.prizePool > 0 ? 'specified' : 'auto',
    valuableRewardExists: draft.valuableRewardExists,
    sponsorFundedRewardExists: draft.sponsorFundedRewardExists,
  }), [draft.entryFee, draft.prizePool, draft.sponsorFundedRewardExists, draft.valuableRewardExists]);

  function update<K extends keyof TournamentDraft>(key: K, value: TournamentDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value })); setError(null);
  }
  function selectGame(game: GameKey) {
    const nextPlatforms = GAMES[game].platforms;
    setDraft((current) => ({ ...current, game, platform: nextPlatforms.includes(current.platform) ? current.platform : nextPlatforms[0] }));
    setError(null);
  }
  function validateCurrentStep() {
    if (step === 1 && draft.title.trim().length < 3) return 'Enter a tournament name with at least 3 characters.';
    if (step === 2) {
      if (!draft.scheduledFor) return 'Choose the tournament date and time.';
      if (new Date(draft.scheduledFor).getTime() <= Date.now()) return 'The tournament date must be in the future.';
      if (draft.rules.trim().length < 20) return 'Add clear rules with at least 20 characters.';
    }
    if (step === 3 && (draft.valuableRewardExists || draft.sponsorFundedRewardExists) && draft.rewardDescription.trim().length < 3) return 'Describe the reward so Mechi can review it.';
    return null;
  }
  function next() {
    const validationError = validateCurrentStep();
    if (validationError) return setError(validationError);
    setStep((current) => Math.min(STEP_LABELS.length - 1, current + 1)); setError(null);
  }
  async function submit() {
    setSubmitting(true); setError(null);
    try {
      const response = await authFetch('/api/tournaments', { method: 'POST', body: JSON.stringify({
        title: draft.title.trim(), game: draft.game, platform: draft.platform, size: draft.size,
        scheduled_for: new Date(draft.scheduledFor).toISOString(), rules: draft.rules.trim(),
        entry_fee: draft.entryFee, prize_pool_mode: draft.prizePool > 0 ? 'specified' : 'auto',
        prize_pool: draft.prizePool, participant_type: draft.participantType,
        team_size: draft.participantType === 'team' ? draft.teamSize : null,
        valuable_reward_exists: draft.valuableRewardExists,
        sponsor_funded_reward_exists: draft.sponsorFundedRewardExists,
        reward_description: draft.rewardDescription.trim(),
      }) });
      const payload = await response.json().catch(() => null) as { error?: string; tournament?: { slug?: string } } | null;
      if (!response.ok || !payload?.tournament?.slug) {
        setError(payload?.error || 'The tournament could not be created. Review the details and try again.'); return;
      }
      router.push(`/app/organizer/tournaments/${payload.tournament.slug}?created=1`); router.refresh();
    } catch { setError('Connection interrupted. No duplicate tournament was created; try again.'); }
    finally { setSubmitting(false); }
  }

  return <div className={styles.page}>
    <header className={styles.heading}><div><p>Organizer workspace</p><h1>Create a tournament</h1><span>Configure the competition in small, reversible steps. The approval path is explained before submission.</span></div><button type="button" onClick={() => router.push('/app/organizer/tournaments')}>Save and exit</button></header>
    <ol className={styles.stepper} aria-label="Tournament creation progress">{STEP_LABELS.map((label, index) => <li key={label} className={index === step ? styles.currentStep : index < step ? styles.completeStep : ''}><span>{index < step ? <Check size={14}/> : index + 1}</span><strong>{label}</strong></li>)}</ol>
    <div className={styles.layout}>
      <section className={styles.formPanel}>
        <div className={styles.stepHeading}><span>Step {step + 1} of {STEP_LABELS.length}</span><h2>{STEP_LABELS[step]}</h2></div>
        {step === 0 ? <div className={styles.choiceGrid}>
          <button type="button" className={draft.participantType === 'solo' ? styles.selectedChoice : styles.choice} onClick={() => update('participantType', 'solo')}><Gamepad2 size={27}/><strong>Solo players</strong><span>Each player registers, checks in and competes independently.</span><em>{draft.participantType === 'solo' ? 'Selected' : 'Choose solo'}</em></button>
          <button type="button" className={draft.participantType === 'team' ? styles.selectedChoice : styles.choice} onClick={() => update('participantType', 'team')}><UsersRound size={27}/><strong>Teams</strong><span>A captain registers a roster and operates the entry for the team.</span><em>{draft.participantType === 'team' ? 'Selected' : 'Choose teams'}</em></button>
          {draft.participantType === 'team' ? <label className={styles.fullField}><span>Players per team</span><input type="number" min={2} max={32} value={draft.teamSize} onChange={(event) => update('teamSize', Math.max(2, Math.min(32, Number(event.target.value))))}/><small>Between 2 and 32 players. Roster readiness is checked before registration.</small></label> : null}
        </div> : null}
        {step === 1 ? <div className={styles.formGrid}>
          <label className={styles.fullField}><span>Tournament name</span><input autoFocus value={draft.title} maxLength={80} placeholder="Example: Nairobi eFootball Community Cup" onChange={(event) => update('title', event.target.value)}/><small>{draft.title.length}/80 characters</small></label>
          <label><span>Game</span><select value={draft.game} onChange={(event) => selectGame(event.target.value as GameKey)}>{AVAILABLE_GAMES.map(([key, game]) => <option key={key} value={key}>{game.label}</option>)}</select></label>
          <label><span>Platform</span><select value={draft.platform} onChange={(event) => update('platform', event.target.value as PlatformKey)}>{platforms.map((platform) => <option key={platform} value={platform}>{PLATFORMS[platform].label}</option>)}</select></label>
          <fieldset className={styles.fullField}><legend>Bracket size</legend><div className={styles.segmented}>{([4,8,16] as const).map((size) => <button type="button" key={size} aria-pressed={draft.size === size} onClick={() => update('size', size)}>{size} {draft.participantType === 'team' ? 'teams' : 'players'}</button>)}</div></fieldset>
        </div> : null}
        {step === 2 ? <div className={styles.formGrid}>
          <label className={styles.fullField}><span>Date and time</span><input type="datetime-local" value={draft.scheduledFor} onChange={(event) => update('scheduledFor', event.target.value)}/><small>Shown to players in East Africa Time and their local equivalent where available.</small></label>
          <label className={styles.fullField}><span>Competition rules</span><textarea rows={8} value={draft.rules} placeholder="Eligibility, match format, reporting deadline, evidence and dispute rules…" onChange={(event) => update('rules', event.target.value)}/><small>Players see these before joining.</small></label>
        </div> : null}
        {step === 3 ? <div className={styles.formGrid}>
          <label><span>Entry fee (KES)</span><input type="number" min={0} step={1} value={draft.entryFee} onChange={(event) => update('entryFee', Math.max(0, Math.round(Number(event.target.value))))}/></label>
          <label><span>Cash prize (KES)</span><input type="number" min={0} step={1} value={draft.prizePool} onChange={(event) => update('prizePool', Math.max(0, Math.round(Number(event.target.value))))}/></label>
          <label className={styles.checkField}><input type="checkbox" checked={draft.valuableRewardExists} onChange={(event) => update('valuableRewardExists', event.target.checked)}/><span><strong>There is another valuable reward</strong><small>Voucher, merchandise, device, airtime or another item of value.</small></span></label>
          <label className={styles.checkField}><input type="checkbox" checked={draft.sponsorFundedRewardExists} onChange={(event) => update('sponsorFundedRewardExists', event.target.checked)}/><span><strong>A sponsor funds a reward</strong><small>Mechi must review the sponsor and delivery terms.</small></span></label>
          {(draft.valuableRewardExists || draft.sponsorFundedRewardExists) ? <label className={styles.fullField}><span>Reward description</span><textarea rows={4} value={draft.rewardDescription} placeholder="Describe the reward, provider and delivery." onChange={(event) => update('rewardDescription', event.target.value)}/></label> : null}
        </div> : null}
        {step === 4 ? <div className={styles.review}>
          <div className={classification.required ? styles.reviewPending : styles.reviewReady}>{classification.required ? <CircleAlert size={22}/> : <ShieldCheck size={22}/>}<div><strong>{classification.required ? 'Mechi approval required' : 'Eligible for immediate publication'}</strong><span>{classification.required ? 'The event is saved and sent to Mechi. Registration stays closed until approved.' : 'Entry is free and no cash or valuable reward exists.'}</span></div></div>
          <dl><div><dt>Competition</dt><dd>{draft.title}</dd></div><div><dt>Format</dt><dd>{draft.participantType === 'team' ? `${draft.size} teams · ${draft.teamSize} players each` : `${draft.size} solo players`}</dd></div><div><dt>Game</dt><dd>{GAMES[draft.game].label} · {PLATFORMS[draft.platform].label}</dd></div><div><dt>Schedule</dt><dd>{draft.scheduledFor ? new Intl.DateTimeFormat('en-KE',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Nairobi'}).format(new Date(draft.scheduledFor)) + ' EAT' : 'Not set'}</dd></div><div><dt>Entry and prize</dt><dd>{draft.entryFee ? `KES ${draft.entryFee} entry` : 'Free entry'} · {draft.prizePool ? `KES ${draft.prizePool} cash prize` : 'No cash prize'}</dd></div><div><dt>Approval triggers</dt><dd>{classification.reasons.length ? classification.reasons.map((reason) => reason.replace(/_/g,' ')).join(', ') : 'None'}</dd></div></dl>
        </div> : null}
        {error ? <div className={styles.error} role="alert"><CircleAlert size={18}/><span>{error}</span></div> : null}
        <footer className={styles.actions}><button type="button" className={styles.back} disabled={step === 0 || submitting} onClick={() => { setStep((current) => Math.max(0,current - 1)); setError(null); }}><ArrowLeft size={16}/> Back</button>{step < STEP_LABELS.length - 1 ? <button type="button" className={styles.next} onClick={next}>Continue <ArrowRight size={16}/></button> : <button type="button" className={styles.next} disabled={submitting} onClick={submit}>{submitting ? 'Creating…' : classification.required ? 'Submit for approval' : 'Create and publish'} <ArrowRight size={16}/></button>}</footer>
      </section>
      <aside className={styles.policyPanel}><ShieldCheck size={25}/><h2>Safe publishing policy</h2><p>Any eligible account can host. Only a genuinely free, no-reward tournament publishes immediately.</p><ul><li>Free entry</li><li>KES 0 cash prize</li><li>No valuable reward</li><li>No sponsor-funded reward</li></ul><div className={classification.required ? styles.livePending : styles.liveReady}><span/><strong>{classification.required ? 'Approval path' : 'Immediate path'}</strong><small>{classification.required ? 'Registration remains closed' : 'No approval trigger detected'}</small></div><p className={styles.policyFootnote}><Trophy size={16}/> Paid and rewarded tournaments are allowed; they are reviewed before players can join.</p></aside>
    </div>
  </div>;
}
