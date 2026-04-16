import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ScrollText } from 'lucide-react';
import { verifyToken } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import type { AuditLog } from '@/types';

async function getLogs(): Promise<AuditLog[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  const supabase = createServiceClient();

  if (!payload?.sub) {
    redirect('/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', payload.sub)
    .single();

  if (!profile || profile.is_banned || profile.role !== 'admin') {
    redirect('/admin');
  }

  const { data } = await supabase
    .from('admin_audit_logs')
    .select('*, admin:admin_id(id, username)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (data ?? []) as AuditLog[];
}

const ACTION_META: Record<string, { label: string; className: string }> = {
  ban_user: { label: 'Ban user', className: 'text-red-400' },
  unban_user: { label: 'Unban user', className: 'text-[var(--brand-teal)]' },
  change_role: { label: 'Change role', className: 'text-amber-400' },
  override_match: { label: 'Override match', className: 'text-[#60A5FA]' },
  cancel_match: { label: 'Cancel match', className: 'text-orange-400' },
  resolve_dispute: { label: 'Resolve dispute', className: 'text-[var(--brand-teal)]' },
  cancel_tournament: { label: 'Cancel tournament', className: 'text-red-400' },
  override_tournament_winner: {
    label: 'Override tournament winner',
    className: 'text-[var(--brand-coral)]',
  },
  cancel_queue_entry: { label: 'Cancel queue entry', className: 'text-[#60A5FA]' },
  rerun_matchmaking: { label: 'Rerun matchmaking', className: 'text-[var(--brand-teal)]' },
  close_lobby: { label: 'Close lobby', className: 'text-[var(--brand-coral)]' },
  remove_lobby_member: { label: 'Remove lobby member', className: 'text-amber-400' },
  delete_suggestion: { label: 'Delete suggestion', className: 'text-[var(--text-secondary)]' },
  system_note: { label: 'System note', className: 'text-[var(--text-soft)]' },
};

export default async function AdminLogsPage() {
  const logs = await getLogs();

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="brand-kicker">Admin audit trail</p>
        <div className="mt-3 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]">
            <ScrollText size={18} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Audit log</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Every admin action lands here so you can trace bans, queue cleanup, lobby intervention,
              and tournament decisions without guessing.
            </p>
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">No audit entries yet.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Once someone performs an admin action, the trail will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2 font-mono text-xs">
          {logs.map((log) => {
            const details = log.details ?? {};
            const reason = typeof details.reason === 'string' ? details.reason : null;
            const name =
              typeof details.username === 'string'
                ? details.username
                : typeof details.title === 'string'
                  ? details.title
                  : typeof details.roomCode === 'string'
                    ? `room ${details.roomCode}`
                    : null;
            const actionMeta = ACTION_META[log.action] ?? {
              label: log.action,
              className: 'text-[var(--text-secondary)]',
            };

            return (
              <div key={log.id} className="card px-4 py-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                  <span className="w-full max-w-[16rem] shrink-0 text-[var(--text-soft)] lg:pt-0.5">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                  <span className="w-full max-w-[10rem] shrink-0 text-[var(--text-secondary)]">
                    {log.admin?.username ?? 'Unknown'}
                  </span>
                  <span className={`w-full max-w-[15rem] shrink-0 font-bold ${actionMeta.className}`}>
                    {actionMeta.label}
                  </span>
                  <div className="min-w-0 flex-1 text-[var(--text-secondary)]">
                    <span>
                      {log.target_type}
                      {log.target_id ? `/${log.target_id.slice(0, 8)}...` : ''}
                    </span>
                    {name ? <span>{` | ${name}`}</span> : null}
                    {reason ? <span>{` | ${reason}`}</span> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
