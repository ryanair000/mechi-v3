import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BrandLogo } from '@/components/BrandLogo';
import { findInviterByCode } from '@/lib/invite';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';
import { createServiceClient } from '@/lib/supabase';

interface Props {
  params: Promise<{ code: string }>;
}

async function getInvite(code: string) {
  return findInviterByCode(createServiceClient(), code);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const inviter = await getInvite(code);

  if (!inviter) {
    return {
      title: 'Invite Not Found | Mechi',
      description: 'This invite link is not active anymore. Join Mechi and start fresh.',
    };
  }

  return {
    title: `${inviter.username} invited you to Mechi`,
    description: `Join Mechi through ${inviter.username}'s invite link and start your climb.`,
  };
}

export default async function JoinInvitePage({ params }: Props) {
  const { code } = await params;
  const inviter = await getInvite(code);

  if (!inviter) {
    return (
      <div className="page-base flex min-h-screen flex-col">
        <nav className="landing-shell flex h-16 items-center justify-between border-b border-[var(--border-color)]">
          <Link href="/" className="flex items-center">
            <BrandLogo size="sm" />
          </Link>
          <Link href="/login" className="brand-link text-sm font-black">
            Sign in
          </Link>
        </nav>

        <main className="landing-shell flex flex-1 items-center justify-center py-16">
          <div className="card circuit-panel w-full max-w-xl p-8 text-center sm:p-10">
            <p className="brand-kicker justify-center">Invite Link</p>
            <div className="mx-auto my-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[rgba(255,107,107,0.14)] text-3xl font-black text-[var(--brand-coral)]">
              ?
            </div>
            <h1 className="text-4xl font-black tracking-normal text-[var(--text-primary)]">
              This invite is not active
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              The link may be old, mistyped, or no longer available. You can still join Mechi and
              start your own climb right away.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={getRegisterPath()} className="btn-primary">
                Join Mechi Free
              </Link>
              <Link href="/" className="btn-ghost">
                Back Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const registerHref = getRegisterPath({ invite: inviter.invite_code });

  return (
    <div className="page-base flex min-h-screen flex-col">
      <nav className="landing-shell flex h-16 items-center justify-between border-b border-[var(--border-color)]">
        <Link href="/" className="flex items-center">
          <BrandLogo size="sm" />
        </Link>
        <Link href={getLoginPath()} className="brand-link text-sm font-black">
          Sign in
        </Link>
      </nav>

      <main className="landing-shell flex flex-1 items-center justify-center py-16">
        <div className="card circuit-panel w-full max-w-2xl overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-[var(--border-color)] bg-[var(--surface-strong)] p-8 lg:border-b-0 lg:border-r lg:p-10">
              <p className="brand-kicker">Invite Link</p>
              <h1 className="mt-5 text-4xl font-black tracking-normal text-[var(--text-primary)]">
                {inviter.username} wants you on Mechi
              </h1>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Join free, set your game, and start climbing through clean matches, shareable wins,
                and a profile that actually feels like yours.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="brand-chip px-3 py-1">{inviter.invite_code}</span>
                {inviter.region ? (
                  <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    {inviter.region}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="p-8 lg:p-10">
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] text-2xl font-black text-[var(--brand-teal)]">
                  {inviter.avatar_url ? (
                    <Image
                      src={inviter.avatar_url}
                      alt={`${inviter.username} avatar`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    inviter.username[0]?.toUpperCase() ?? '?'
                  )}
                </div>
                <div>
                  <p className="text-sm text-[var(--text-soft)]">Invited by</p>
                  <p className="text-2xl font-black text-[var(--text-primary)]">{inviter.username}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Bring your best game and make the link worth it.
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Link href={registerHref} className="btn-primary w-full justify-center">
                  Accept Invite
                </Link>
                <Link href={getLoginPath()} className="btn-ghost w-full justify-center">
                  I already have an account
                </Link>
              </div>

              <p className="mt-5 text-xs text-[var(--text-soft)]">
                Your invite is applied automatically when you continue from this link.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
