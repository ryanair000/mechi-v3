'use client';

import { useRouter } from 'next/navigation';
import { LayoutDashboard, Shield } from 'lucide-react';

type ModeratorRoleDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  username: string;
};

export function ModeratorRoleDialog({ isOpen, onClose, username }: ModeratorRoleDialogProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleModeratorPanel = () => {
    onClose();
    router.push('/moderators');
  };

  const handlePlayerDashboard = () => {
    onClose();
    router.push('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--surface-base)] p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(50,224,196,0.12)]">
            <Shield className="h-7 w-7 text-[var(--accent-secondary-text)]" />
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">
            Welcome back, {username}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Where would you like to go?
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleModeratorPanel}
            className="flex w-full items-center gap-4 rounded-xl border border-[rgba(50,224,196,0.25)] bg-[rgba(50,224,196,0.08)] p-4 text-left transition-all hover:border-[rgba(50,224,196,0.4)] hover:bg-[rgba(50,224,196,0.14)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.12)]">
              <Shield className="h-6 w-6 text-[var(--accent-secondary-text)]" />
            </div>
            <div>
              <div className="font-bold text-[var(--text-primary)]">Moderator Panel</div>
              <div className="text-sm text-[var(--text-secondary)]">
                Manage registrations, check-ins, and match day ops
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handlePlayerDashboard}
            className="flex w-full items-center gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-left transition-all hover:border-[var(--border-color-hover)] hover:bg-white/[0.04]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-white/[0.03]">
              <LayoutDashboard className="h-6 w-6 text-[var(--text-secondary)]" />
            </div>
            <div>
              <div className="font-bold text-[var(--text-primary)]">Player Dashboard</div>
              <div className="text-sm text-[var(--text-secondary)]">
                View your profile, matches, and tournament registrations
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
