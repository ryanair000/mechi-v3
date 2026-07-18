'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, ShieldCheck, Trophy } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import styles from './V5AuthShell.module.css';

interface V5AuthShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  sideEyebrow?: string;
  sideTitle?: string;
  sideDescription?: string;
  sidePoints?: string[];
  backHref?: string;
  hideMainHeader?: boolean;
  hideSideEyebrow?: boolean;
}

const defaultPoints = [
  'One account for every PlayMechi workspace',
  'Verified match history and competition records',
  'Secure tournament entry and Paystack recovery',
];

export function V5AuthShell({
  children,
  title,
  subtitle,
  sideEyebrow = 'Africa’s competitive gaming network',
  sideTitle = 'Your competition starts here.',
  sideDescription = 'Sign in once, then move between your player, team, creator, coach, sponsor, shop, and organizer workspaces.',
  sidePoints = defaultPoints,
  backHref = '/',
  hideMainHeader = false,
  hideSideEyebrow = false,
}: V5AuthShellProps) {
  const mainTitle = title || sideTitle;
  const mainSubtitle = subtitle || sideDescription;
  const points = sidePoints.length ? sidePoints : defaultPoints;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="PlayMechi home">
          <span className={styles.mark}>
            <Image src="/mechi-logo.png" alt="" width={940} height={1117} priority />
          </span>
          <span className={styles.wordmark}>PLAY<span>MECHI</span></span>
        </Link>
        <div className={styles.topActions}>
          <ThemeToggle className={styles.themeToggle} />
          <Link className={styles.homeLink} href={backHref}>
            <ArrowLeft size={15} /> Home
          </Link>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.story} aria-labelledby="auth-story-title">
          <div className={styles.storyGlow} aria-hidden="true" />
          <div className={styles.storyContent}>
            {!hideSideEyebrow ? <p className={styles.eyebrow}>{sideEyebrow}</p> : null}
            <h1 id="auth-story-title">{sideTitle}</h1>
            <p className={styles.storyCopy}>{sideDescription}</p>

            <div className={styles.points}>
              {points.map((point, index) => {
                const Icon = index === 0 ? Trophy : index === 1 ? BadgeCheck : ShieldCheck;
                return (
                  <div className={styles.point} key={point}>
                    <span><Icon size={17} /></span>
                    <p>{point}</p>
                  </div>
                );
              })}
            </div>

            <div className={styles.workspaceStrip}>
              <span>Player</span><span>Team</span><span>Creator</span><span>Organizer</span>
            </div>
          </div>
        </section>

        <section className={styles.formPanel} aria-label="Account access">
          <div className={styles.formInner}>
            {!hideMainHeader && (mainTitle || mainSubtitle) ? (
              <div className={styles.formHeader}>
                <p>MECHI CLUB</p>
                {mainTitle ? <h2>{mainTitle}</h2> : null}
                {mainSubtitle ? <span>{mainSubtitle}</span> : null}
              </div>
            ) : null}
            {children}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>© 2026 PlayMechi</span>
        <span>Credible competition. Clear records. One account.</span>
      </footer>
    </main>
  );
}
