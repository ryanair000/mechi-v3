'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, Headphones, LockKeyhole, MessageSquareText, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import styles from './Support.module.css';

type SupportCase = { id: string; subject: string; issue_category: string; context_type?: string | null; context_id?: string | null; case_reference: string; status: string; resolution_summary?: string | null; last_message_at: string; latest_message?: { body?: string | null; sender_type?: string } | null };
type SupportMessage = { id: string; direction: string; sender_type: string; body?: string | null; created_at: string };

const topics = [
  ['Tournament or registration', 'Eligibility, check-in, schedule, rules, or joining a tournament.', 'tournament'],
  ['Payment or refund', 'Tournament payment, receipt, failed checkout, refund, or prize status.', 'payment'],
  ['Match result', 'Reported score, confirmation, screenshot proof, or a disputed result.', 'match_result'],
  ['Team', 'Invitation, player role, roster, ownership, or team tournament setup.', 'team'],
  ['Account access', 'Sign-in, profile, game account, verification, or account recovery.', 'account'],
  ['Safety', 'Harassment, threats, cheating, blocking, or another urgent safety concern.', 'safety'],
] as const;

function statusCopy(status: string) {
  if (status === 'waiting_on_human') return 'Waiting for Mechi Support';
  if (status === 'waiting_on_ai') return 'Support is preparing a reply';
  if (status === 'resolved') return 'Resolved';
  if (status === 'blocked') return 'Closed by Support';
  return 'Reply available';
}

export default function SupportPage() {
  const { user, loading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ case: SupportCase; messages: SupportMessage[] } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('tournament');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contextType, setContextType] = useState('general');
  const [contextId, setContextId] = useState('');
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedCase = params.get('case');
      const type = params.get('context_type');
      const id = params.get('context_id');
      const requestedCategory = params.get('category');
      if (requestedCase) setSelectedId(requestedCase);
      if (type) setContextType(type);
      if (id) setContextId(id);
      if (requestedCategory) { setCategory(requestedCategory); setShowForm(true); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadCases = useCallback(async () => {
    if (!user) return;
    setCasesLoading(true);
    try {
      const response = await authFetch('/api/support');
      const payload = (await response.json()) as { cases?: SupportCase[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not load support cases.');
      setCases(payload.cases ?? []);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load support cases.'); }
    finally { setCasesLoading(false); }
  }, [authFetch, user]);

  const loadDetail = useCallback(async (caseId: string) => {
    try {
      const response = await authFetch(`/api/support/${caseId}`);
      const payload = (await response.json()) as { case?: SupportCase; messages?: SupportMessage[]; error?: string };
      if (!response.ok || !payload.case) throw new Error(payload.error ?? 'Could not load the case.');
      setDetail({ case: payload.case, messages: payload.messages ?? [] });
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load the case.'); setSelectedId(null); }
  }, [authFetch]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => void loadCases(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCases, user]);
  useEffect(() => {
    if (!user || !selectedId) return;
    const timer = window.setTimeout(() => void loadDetail(selectedId), 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail, selectedId, user]);

  const selectedTopic = useMemo(() => topics.find((topic) => topic[2] === category), [category]);

  async function createCase(event: React.FormEvent) {
    event.preventDefault(); setSending(true);
    try {
      const response = await authFetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, subject, message, context_type: contextType, context_id: contextId, idempotency_key: crypto.randomUUID() }) });
      const payload = (await response.json()) as { case?: SupportCase; error?: string };
      if (!response.ok || !payload.case) throw new Error(payload.error ?? 'Could not create the case.');
      toast.success(`${payload.case.case_reference} created.`); setSubject(''); setMessage(''); setShowForm(false); setSelectedId(payload.case.id); await loadCases();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not create the case.'); }
    finally { setSending(false); }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault(); if (!selectedId) return; setSending(true);
    try {
      const response = await authFetch(`/api/support/${selectedId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: reply }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not send the reply.');
      setReply(''); await Promise.all([loadDetail(selectedId), loadCases()]);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send the reply.'); }
    finally { setSending(false); }
  }

  async function resolveCase() {
    if (!selectedId) return; setSending(true);
    try {
      const response = await authFetch(`/api/support/${selectedId}/resolve`, { method: 'POST' });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Could not close the case.');
      toast.success('Case marked as resolved.'); await Promise.all([loadDetail(selectedId), loadCases()]);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not close the case.'); }
    finally { setSending(false); }
  }

  return <div className={styles.page}>
    <header className={styles.siteHeader}><Link className={styles.brand} href="/"><span>M</span> PlayMechi</Link><nav><Link href="/tournaments">Tournaments</Link>{user ? <Link href="/dashboard">Player home</Link> : <Link className={styles.headerCta} href="/login?next=%2Fsupport">Sign in</Link>}</nav></header>
    <main>
      <section className={styles.hero}><div><p className={styles.eyebrow}>Mechi Support</p><h1>Get back to playing</h1><p>Find the right help, report a problem with its tournament or match context, and follow your case in one conversation.</p></div><div className={styles.trust}><ShieldCheck /><span><strong>Safe and private</strong><small>Only you and authorized Mechi operators can read an account case.</small></span></div></section>

      {detail ? <section className={styles.caseView}><button className={styles.back} onClick={() => setSelectedId(null)}><ArrowLeft size={17} /> All cases</button><header><div><p className={styles.eyebrow}>{detail.case.case_reference}</p><h2>{detail.case.subject}</h2><p>{statusCopy(detail.case.status)}</p></div>{detail.case.status !== 'resolved' && detail.case.status !== 'blocked' ? <button onClick={() => void resolveCase()} disabled={sending}><CheckCircle2 size={17} /> Mark resolved</button> : null}</header><div className={styles.conversation}>{detail.messages.map((item) => <article className={item.sender_type === 'user' ? styles.playerMessage : styles.supportMessage} key={item.id}><strong>{item.sender_type === 'user' ? 'You' : item.sender_type === 'system' ? 'Update' : 'Mechi Support'}</strong><p>{item.body}</p><time>{new Date(item.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</time></article>)}</div>{detail.case.status !== 'blocked' ? <form className={styles.replyForm} onSubmit={sendReply}><label>Reply<textarea required minLength={2} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Add an update or answer from Support" /></label><button disabled={sending}><Send size={17} /> Send reply</button></form> : null}</section> : <>
        <section className={styles.topics}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Choose a topic</p><h2>What do you need help with?</h2></div></div><div className={styles.topicGrid}>{topics.map(([title, copy, value]) => <button key={value} onClick={() => { setCategory(value); setShowForm(true); setSubject(title); }}><CircleHelp /><span><strong>{title}</strong><small>{copy}</small></span><ArrowRight /></button>)}</div></section>

        {authLoading ? <div className={styles.loading}><RefreshCw /> Checking your account...</div> : !user ? <section className={styles.signInCard}><LockKeyhole /><div><h2>Sign in to contact Support</h2><p>Your case stays connected to your Mechi account, tournament, match, payment, or team.</p></div><Link href="/login?next=%2Fsupport">Sign in and continue <ArrowRight size={17} /></Link></section> : <div className={styles.accountGrid}>
          <section className={styles.caseList}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Your cases</p><h2>Support conversations</h2></div><button onClick={() => setShowForm(true)}>New case</button></div>{casesLoading ? <div className={styles.loading}><RefreshCw /> Loading cases...</div> : cases.length ? <div>{cases.map((item) => <button className={styles.caseRow} key={item.id} onClick={() => setSelectedId(item.id)}><MessageSquareText /><span><strong>{item.subject}</strong><small>{item.case_reference} · {statusCopy(item.status)}</small><em>{item.latest_message?.body || 'Open the case conversation'}</em></span><ArrowRight /></button>)}</div> : <div className={styles.empty}><Headphones /><h3>No support cases</h3><p>Choose a help topic when you need us. Tournament and match links can attach the right context automatically.</p></div>}</section>

          {showForm ? <form className={styles.caseForm} onSubmit={createCase}><div><p className={styles.eyebrow}>New support case</p><h2>{selectedTopic?.[0] ?? 'Tell us what happened'}</h2><p>{selectedTopic?.[1]}</p></div><label>Help topic<select value={category} onChange={(event) => setCategory(event.target.value)}>{topics.map(([title,,value]) => <option value={value} key={value}>{title}</option>)}<option value="other">Something else</option></select></label><label>Subject<input required minLength={4} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label>What happened?<textarea required minLength={10} maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Include what you expected, what happened, and any deadline." /></label>{contextId ? <div className={styles.context}><ShieldCheck /><span><strong>Context attached</strong><small>{contextType}: {contextId}</small></span></div> : null}<div className={styles.formActions}><button type="button" onClick={() => setShowForm(false)}>Cancel</button><button disabled={sending}>{sending ? 'Creating...' : 'Create support case'}</button></div></form> : <aside className={styles.helpAside}><Headphones /><h2>Need to contact us?</h2><p>Choose a topic above or start a case. For urgent account safety, choose Safety so the case receives the right priority.</p><button onClick={() => setShowForm(true)}>Create support case</button></aside>}
        </div>}
      </>}
    </main>
    <footer><span>PlayMechi Support</span><div><Link href="/terms">Terms</Link><Link href="/privacy-policy">Privacy</Link></div></footer>
  </div>;
}
